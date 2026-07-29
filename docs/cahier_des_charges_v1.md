# Cahier des charges — Bataille des cartes, version 1

> Document d'implémentation. Il ne contient aucune règle de jeu : il renvoie à `spec_bataille_des_cartes.md` par numéro de section.
> Les arbitrages listés en section 6 et 7 ont été tranchés en session et ne figurent pas encore dans la spec de règles. Ils doivent y être répercutés (voir annexe A).
> En cas de divergence entre ce document et la spec de règles sur un point de règle : la spec fait foi, sauf pour les arbitrages de l'annexe A, qui sont plus récents.

---

## 1. Objectif et non-objectifs

### Objectif

Spécifier l'implémentation de la première version jouable en ligne de *Bataille des cartes* : 2 à 4 joueurs, mode Classique, sans compte, sur un sous-ensemble de contenu. Destinataires : Yassine et ses proches.

Ce que cette version doit prouver avant qu'on aille plus loin :

- la résolution différée fonctionne et reste lisible pour les joueurs
- l'information cachée tient (aucune fuite de kit, de main ou de ressources)
- une partie à 4 se joue de bout en bout sans blocage
- la boucle de jeu reste amusante en ligne, sans la présence physique des joueurs

### Non-objectifs

Ce document ne définit aucune règle de jeu, ne traite pas du modèle économique, et ne couvre pas les lots reportés (section 9).

---

## 2. Périmètre V1

Point structurant : les cartes d'attaque et d'action sont **communes** — chaque kit les tire aléatoirement à la distribution (spec §4). Réduire le nombre de kits ne réduit donc pas le nombre de cartes communes à implémenter.

| Élément | Contenu V1 |
|---|---|
| Joueurs | 2 à 4 |
| Mode | Classique uniquement, plafond 25 vies (spec §7) |
| Kits | L'Intouchable, Le Kamikaze, Le Scientifique, L'Assassin (spec §4) |
| Cartes d'attaque | Les 3 (spec §2) — communes, toutes requises |
| Cartes d'action | Les 7 (spec §3) — communes, toutes requises |
| Cartes spéciales | 6 : Suicide, Espion-Voleur, Imposition, Clonage, Sentence, Générateur de points (spec §5) |
| Élimination et récompenses | Requis (spec §6) |
| Comptes | Aucun — lien/code de partie + pseudo |

Total : 16 cartes, 4 kits.

Les 4 kits ont été choisis pour couvrir les mécaniques structurantes avec le minimum de contenu :

| Kit | Mécanique couverte |
|---|---|
| Le Kamikaze | Perte de vie hors attaque (Suicide) ; stats de départ atypiques |
| L'Intouchable | Immunité permanente (exception à une règle générale) ; effet persistant à compteur (Imposition) |
| Le Scientifique | Trait de kit sur amélioration ; remplacement complet d'état (Clonage) |
| L'Assassin | Seule dérogation à « une action par tour » ; effet à compteur (Générateur de points) ; auto-ciblage possible (Sentence) |

---

## 3. Stack technique

| Couche | Choix |
|---|---|
| Langage | TypeScript, backend et frontend |
| Backend | Node.js + Colyseus (salons, synchronisation d'état, reconnexion) |
| Frontend | React |
| Structure | Monorepo : `apps/server`, `apps/client`, `packages/shared` |
| Base de données | Postgres — **uniquement** le journal des parties terminées |
| Hébergement | VPS + Coolify |
| État de partie | En mémoire côté serveur, par salon |

### Contraintes

- **Serveur autoritaire.** Aucune logique de règle côté client. Le client affiche et transmet des intentions ; le serveur valide tout.
- **`packages/shared` porte les types communs** (Card, Kit, GameState, Effect). Une définition unique, jamais dupliquée entre client et serveur.
- **La base de données ne contient jamais l'état d'une partie en cours.** Une seule écriture, à la fin de chaque partie. Un redémarrage serveur en cours de partie perd la partie : c'est accepté pour le V1.
- **Pas de bot au V1.** Si un bot est ajouté plus tard, le moteur doit exposer une interface `(état de partie, actions légales) → action choisie`, pour permettre un bot heuristique en TS ou un service externe sans toucher au moteur.

---

## 4. Architecture du moteur

### 4.1 Modèle de données

```
GameState
├── players: Player[]
├── pool: Card[]                    // pool partagé (spec §1)
├── currentTurnPlayerId
├── turnSequence: number            // séquence globale, sert de queuedAt
├── mode: 'classique'
└── lifeLimit: 25

Player
├── id, pseudo, kitId
├── vies, points, pointsAmelioration, bouclier
├── hand: PlayerCard[]              // avec flag isUpgraded par exemplaire
├── specialCards: SpecialCard[]
├── pendingEffects: PendingEffect[] // file de résolution différée
├── activePersistentEffects: PersistentEffect[]
├── turnLedger: TurnLedger          // voir 4.4
└── connectionState: ConnectionState

Card (donnée statique)
├── id, name, type: 'attack' | 'action' | 'special'
├── cost: { points?, vies?, pointsParVie? }
├── effect, upgradeEffect
└── sellValue, buyMultiplier

Kit (donnée statique)
├── id, name
├── startingResources: { vies, points, pointsAmelioration, pioche }
├── startingCardCounts: { action, attack }
├── specialCards: string[]
└── traits: KitTraits               // voir 4.5

PendingEffect
├── sourcePlayerId, targetPlayerId
├── cardId, isUpgraded
└── queuedAt: number                // séquence serveur, FIFO
```

### 4.2 Deux primitives de perte de vie, jamais fusionnées

Distinction de la spec §1, à matérialiser en deux fonctions séparées :

| Fonction | Usage | Bouclier | Compteurs de cartes |
|---|---|---|---|
| `applyDamage(target, amount, source)` | Cartes de type attaque uniquement | Absorbe en premier, excédent reporté sur les vies | Décrémente les compteurs des cartes actives du joueur touché |
| `applyLifeLoss(target, amount, reason)` | Taxe, Suicide, Imposition, toute perte hors attaque | Ignoré | Aucun effet |

Fusionner ces deux chemins est l'erreur la plus probable et la plus silencieuse de tout le projet. Le linter ne l'attrapera pas, le jeu tournera normalement, et les boucliers protégeront contre des choses qu'ils ne doivent pas bloquer.

### 4.3 Boucle de tour

```
1. Début du tour du joueur P — démarrage du minuteur de 30 s
2. P joue son unique action
   (Assassin : plusieurs cartes d'attaque comptent pour une seule action)
   Si le minuteur expire → pioche automatique
3. Résolution des pendingEffects de P, par ordre croissant de queuedAt
   Avant chaque résolution d'attaque : vérifier l'annulation mutuelle (4.6)
4. Application des effets persistants qui visent P
5. Vérification élimination et condition de victoire
6. Tour suivant
```

Invariant : un joueur ne subit jamais de perte de vie ou de ressource en dehors de son propre tour, et jamais avant d'avoir joué son action (spec §6).

### 4.4 Journal de tour

Absorbeur (spec §3) exige de connaître ce qu'un adversaire a perdu et dépensé lors de son dernier tour. Un diff d'état ne suffit pas : il faut distinguer ce qui a été **activement dépensé** de ce qui a été **volé par un tiers**.

`TurnLedger` enregistre, pour le tour complet le plus récent de chaque joueur (action + phase de résolution) :

- vies perdues, toutes causes confondues
- points activement dépensés
- points d'amélioration activement dépensés
- ressources perdues par vol (exclues de la capture d'Absorbeur amélioré)

### 4.5 Traits de kit

Certains kits appliquent une propriété permanente à un type de carte, pas à un exemplaire :

```ts
traits: {
  alwaysUpgraded: string[],              // Scientifique : ['espionnage']
  immuneTo: string[],                    // Intouchable : ['voleur', 'espionnage']
  allowsMultipleAttacksPerTurn: boolean, // Assassin
  gainPointsPerLifeLost: number | null   // hors V1 (Fantôme)
}
```

`alwaysUpgraded` est consulté **à chaque acquisition de carte**, quelle que soit son origine : distribution, achat, récompense d'élimination. Toutes les copies détenues sont concernées. Ce n'est pas un flag posé une fois à la distribution.

### 4.6 Attaques mutuelles

Deux attaques dirigées l'une contre l'autre entre deux joueurs, toutes deux encore en attente :

- **Dégâts égaux** → les deux sont annulées, au tour du joueur qui a riposté. Personne ne subit rien.
- **Dégâts différents** → aucune interaction. Chaque attaque se résout normalement, au tour de sa propre cible.

Cette règle remplace la clause « la plus forte l'emporte » de la spec §6, qui est supprimée (annexe A).

Conséquence : la comparaison se déclenche toujours au tour du joueur qui a attaqué en second, puisque la riposte ne peut naître que pendant son propre tour et que sa phase de résolution suit immédiatement.

### 4.7 Règle de contre

S'applique à Espionnage, Voleur et Miroir uniquement (spec §1). La carte de contre **doit viser la source** de l'effet en attente. Les deux effets s'annulent, les deux cartes sont consommées, les deux coûts sont payés.

Ne s'applique pas aux cartes d'attaque : elles relèvent de 4.6.

---

## 5. Protocole client-serveur

### 5.1 Modèle de visibilité

| Catégorie | Visibilité |
|---|---|
| Kit, contenu de la main, valeur exacte des ressources | Privé. Révélé uniquement par Espionnage ou Espion-Voleur |
| Toute action jouée, identité de la carte comprise | Publique — y compris les achats, ventes, améliorations et pioches |
| File des effets en attente | Publique |
| Nombre de cartes en main, vies, bouclier, statut | Public |

Le serveur **construit une vue par destinataire**. Il ne construit jamais un état complet qu'il filtre à l'envoi : ce pattern laisse fuiter les champs ajoutés plus tard.

Espionnage crée un droit de visibilité persistant et asymétrique. Il faut une matrice `qui voit quoi de qui`, consultée à chaque construction de vue, isolée dans un module dédié.

### 5.2 Événements client → serveur

| Événement | Payload |
|---|---|
| `createRoom` | pseudo |
| `joinRoom` | codePartie, pseudo |
| `startGame` | — (hôte, 2 à 4 joueurs présents) |
| `playCard` | cardId, targetPlayerId? |
| `playMultipleAttacks` | [{cardId, targetPlayerId}] — Assassin uniquement |
| `buyCard` / `sellCard` | cardId |
| `upgradeCard` | cardId |
| `buyUpgradePoint` | — |
| `drawCard` | — |
| `buySpecialCard` | — (20 points) |
| `chooseMirrorTarget` | pendingEffectId, newTargetPlayerId |
| `chooseEliminationReward` | eliminationId, [choix1, choix2] |

### 5.3 Événements serveur → clients

| Événement | Contenu |
|---|---|
| `stateUpdate` | Vue personnalisée par destinataire |
| `turnStarted` | joueur actif, échéance du minuteur |
| `actionPlayed` | diffusé immédiatement — qui a joué quoi, sur qui |
| `actionResolved` | diffusé à la résolution |
| `mirrorChoiceRequired` | envoyé au seul joueur concerné, avec échéance |
| `rewardChoiceRequired` | envoyé au seul éliminateur, séquençable |
| `playerEliminated` / `gameOver` | — |
| `error` | action rejetée |

`actionPlayed` et `actionResolved` sont deux événements distincts. Les confondre casse le modèle : une action est publique dès qu'elle est jouée, sa résolution arrive plus tard.

### 5.4 Validation

Toute action est revalidée intégralement côté serveur : possession de la carte, ressources suffisantes, tour du joueur, cible valide, action autorisée par le kit. Griser un bouton côté client n'est pas une validation.

### 5.5 Minuteurs

| Minuteur | Durée | À l'expiration |
|---|---|---|
| Tour | 30 s | Pioche automatique |
| Sous-choix | 20 s | Voir 5.6 |
| Fenêtre de reconnexion | 60 s | Le joueur passe absent |

Sous-choix du V1 : ciblage du Miroir, sélection des récompenses d'élimination. La sélection multiple de l'Assassin n'en est pas un — c'est son action de tour, couverte par les 30 s.

### 5.6 Actions par défaut à l'expiration d'un sous-choix

- **Miroir** : la première attaque de la file est redirigée vers un adversaire tiré au sort.
- **Récompenses** : 2 × 4 vies attribuées d'office.

Une carte déjà payée n'est jamais gaspillée silencieusement. Le joueur perd l'optimisation, pas le bénéfice.

### 5.7 Déconnexion et inactivité

Deux mécanismes indépendants.

**Déconnexion :**
1. Fenêtre de 60 s en temps réel, déclenchée à l'instant de la déconnexion, indépendamment du tour en cours.
2. Reconnexion avant expiration : aucun effet.
3. Après expiration, le joueur est absent. À chacun de ses tours, il pioche **immédiatement**, sans attendre les 30 s.
4. Après 3 tours automatiques, il est éliminé. Aucun éliminateur, donc aucune récompense ; ses cartes rejoignent le pool.
5. Toute reconnexion réinitialise la fenêtre de 60 s et le compteur de 3 tours.

**Inactivité en étant connecté :**
1. Le minuteur de 30 s expire, le joueur pioche.
2. Après 5 tours expirés consécutifs, il est éliminé, dans les mêmes conditions.

Dans les deux cas, le joueur reste une cible valide : il subit attaques et effets persistants normalement. Aucune immunité.

À 2 joueurs, cette élimination donne la victoire par forfait au joueur restant.

Cas accepté : un joueur qui se déconnecte pendant son propre tour bloque la partie jusqu'à 60 s.

---

## 6. Contenu V1 et arbitrages de règles

### 6.1 Mapping

| Carte | Spec | Note d'implémentation |
|---|---|---|
| Attaque de base / moyenne / Super attaque | §2 | Voir 4.6 |
| Absorbeur | §3 | Requiert `TurnLedger` (4.4) |
| Espionnage | §3 | Matrice de visibilité (5.1) |
| Voleur | §3 | Plafonné au montant de la cible |
| Miroir | §3 | Sous-choix (5.5) |
| Bouclier | §3 | Un seul actif à la fois |
| Taxe | §3 | `applyLifeLoss`, jamais `applyDamage` |
| Régénération | §3 | Plafond 25 vies |
| Suicide | §5 | Voir arbitrage 3 |
| Espion-Voleur | §5 | Vol sans plafond + espionnage global |
| Imposition | §5 | Compteur 2, voir arbitrage 9 |
| Clonage | §5 | Voir arbitrage 11 |
| Sentence | §5 | Peut cibler son utilisateur si non améliorée |
| Générateur de points | §5 | Compteur 3 |

### 6.2 Arbitrages

| # | Arbitrage |
|---|---|
| 1 | **Scientifique** : trait `alwaysUpgraded: ['espionnage']`. Permanent, tous exemplaires, quelle que soit l'origine de la carte |
| 2 | **Auto-élimination** : aucune récompense pour personne, cartes au pool |
| 3 | **Suicide** : version de base, aucune récompense pour personne. Version améliorée, l'utilisateur survit et touche les récompenses des adversaires éliminés |
| 4 | **Élimination multiple** : 2 récompenses par joueur éliminé, cumulables |
| 5 | **Miroir** : le joueur choisit parmi les attaques en attente. Rejeté comme action invalide s'il n'y a rien à rediriger |
| 6 | **Contre** : la carte de contre doit viser la source |
| 7 | **Visibilité** : toutes les actions publiques, identité de carte comprise. Privés : kit, main, valeur des ressources |
| 8 | **Attaques mutuelles** : annulation uniquement à dégâts égaux. Dégâts différents, aucune interaction |
| 9 | **Imposition** : l'utilisateur gagne la vie cédée, plafond 25 appliqué |
| 10 | **Carte spéciale à 20 points** : au V1, tirage restreint aux 6 cartes du lot. Contrainte de périmètre, pas règle de jeu |
| 11 | **Clonage** : annule les effets en attente contre l'utilisateur, n'hérite d'aucun effet en attente de la cible, remet à zéro toute visibilité dans les deux sens |
| 12 | **Absorbeur** : « dernier coup » = tour complet le plus récent de l'adversaire, phase de résolution incluse |

### 6.3 Précisions

- Le plafond de 25 vies (spec §7) s'applique à toute source de gain : Régénération, Absorbeur, Imposition, récompenses d'élimination, Clonage amélioré.
- Le **pool partagé** doit être alimenté correctement (ventes, cartes spéciales utilisées, cartes des éliminés), mais aucune carte du V1 ne le lit. Il reste en écriture seule. Ne lui inventer aucun usage.
- Les valeurs de dégâts du V1 sont toutes distinctes (1, 2, 3, 4, 7, 10). Deux attaques de dégâts égaux sont donc forcément la même carte au même niveau d'amélioration.

---

## 7. Interface

Visuel fonctionnel, aucune direction artistique. Une contrainte d'architecture de l'information domine : puisque toutes les actions sont publiques, **le journal des actions est l'organe principal de l'écran**, pas un accessoire.

### Écrans

1. **Accueil** — créer une partie (génère un code) ou rejoindre. Saisie du pseudo.
2. **Salon** — joueurs connectés, l'hôte lance à partir de 2 joueurs, 4 maximum.
3. **Table** — écran unique de jeu.
4. **Fin de partie** — vainqueur et récapitulatif.

### Table

| Zone | Contenu |
|---|---|
| Adversaires | Pseudo, vies, bouclier, statut, nombre de cartes. Ressources exactes et kit uniquement si révélés |
| File d'effets en attente | Publique : source, carte, cible, non encore résolu |
| Journal des actions | Historique complet et consultable depuis le début de la partie |
| Zone privée | Main, cartes spéciales, kit, ressources exactes |
| Actions | Jouer, acheter, vendre, améliorer, piocher, acheter un point d'amélioration, acheter une carte spéciale |
| Tour | Joueur actif, ordre de passage, minuteur visible |
| États dégradés | Joueur absent, compteur de tours automatiques avant élimination |

### Interactions à prévoir

Sélection de cible ; choix de l'attaque à rediriger (Miroir) ; sélection multiple de l'Assassin ; séquence de choix de récompenses ; affichage des minuteurs de tour et de sous-choix.

---

## 8. Definition of Done

### Niveau 1 — Invariants du moteur

- Une action visée ne se résout jamais avant le tour de sa cible
- Les effets en attente se résolvent après l'action de la cible
- `applyDamage` passe par le bouclier, `applyLifeLoss` jamais
- `applyDamage` décrémente les compteurs du joueur touché, `applyLifeLoss` jamais
- Une seule action par tour, sauf Assassin
- Plafond de 25 vies sur toute source de gain

### Niveau 2 — Information cachée

- Aucun client ne reçoit le kit, la main ou les ressources exactes d'un adversaire non espionné
- Toutes les actions sont diffusées à tous, identité de carte comprise
- La file d'effets en attente est publique
- Espionnage persiste jusqu'à la fin de la partie
- Clonage remet la visibilité à zéro dans les deux sens

### Niveau 3 — Arbitrages

Un test dédié par ligne du tableau 6.2, plus les règles de minuteurs et de seuils de la section 5.

### Niveau 4 — Cartes

16 cartes, en version de base et améliorée : 32 tests minimum.

### Niveau 5 — Kits

Ressources de départ conformes, distribution respectant les quantités, capacité spéciale effective. Test spécifique pour le Scientifique : un Espionnage **acheté en cours de partie** doit arriver déjà amélioré.

### Niveau 6 — Cycle de vie

Déconnexion (60 s, pioche immédiate, 3 tours, élimination sans récompense), inactivité connectée (30 s, 5 tours), sous-choix (20 s et actions par défaut), victoire par forfait à 2 joueurs, dernier survivant.

### Critères formels

- `tsc` sans erreur
- Linter propre
- Tests verts, aucun test désactivé ou ignoré
- Toute carte ou règle touchée a son test créé ou mis à jour
- Aucune dépendance ajoutée hors du fichier de lock

---

## 9. Hors périmètre V1

À ne pas implémenter, même partiellement, même « pour préparer le terrain » :

- Les 11 kits restants et leurs cartes spéciales
- Modes Équipe, Dieu, Partie rapide
- Bots, heuristiques ou apprenants
- Comptes utilisateurs, authentification
- Persistance de l'état d'une partie en cours
- Monétisation, boutique, déblocage de contenu
- Direction artistique

---

## Annexe A — Points à répercuter dans la spec de règles

Ces points ont été tranchés en session et ne figurent pas encore dans `spec_bataille_des_cartes.md`. Certains la corrigent.

| # | Point | Nature |
|---|---|---|
| 1 | L'action « piocher » n'est définie nulle part. Interprétation retenue : gagner un nombre de points égal à la valeur Pioche du kit — **à confirmer** | Manque |
| 2 | Améliorations de kit : trait permanent sur un type de carte, pas propriété d'un exemplaire | Correction du modèle §4 |
| 3 | Visibilité des actions : publiques, identité de carte comprise | Manque |
| 4 | Auto-élimination : aucune récompense | Manque §6 |
| 5 | Élimination multiple : 2 récompenses par joueur éliminé | Précision §6 |
| 6 | Attaques mutuelles : la clause « la plus forte l'emporte » de §6 est **supprimée**. Seule subsiste l'annulation à dégâts égaux | Correction §6 |
| 7 | Contre : doit viser la source | Précision §1 |
| 8 | Miroir : choix parmi plusieurs attaques en attente ; invalide si aucune | Manque §3 |
| 9 | Imposition : l'utilisateur gagne la vie cédée | Manque §5 |
| 10 | Clonage : annule les effets en attente contre l'utilisateur, remet la visibilité à zéro | Manque §5 |
| 11 | Absorbeur : définition de « dernier coup » | Précision §3 |
| 12 | Limite de temps par tour et gestion de la déconnexion : n'existent pas dans la spec, propres au jeu vidéo | Ajout |

### Points ouverts, hors V1, à traiter avant l'ajout des kits restants

- **Le Guerrier** : « toutes les attaques déjà améliorées » sous le nouveau modèle de trait signifie que chaque attaque achetée en cours de partie arrive améliorée. Une Super attaque à 20 points infligerait 10 dégâts au lieu de 7, sans limite. À arbitrer.
- **Voleur de point d'amélioration** contre un kit à trait permanent : la carte retire les améliorations, mais le trait les réapplique aussitôt. Conflit non résolu.

### À noter pour la passe d'équilibrage

- Suicide amélioré est accessible immédiatement au Kamikaze (1 point d'amélioration de départ). À 4 joueurs, éliminer 2 adversaires sur 3 rapporte 4 récompenses face à un dernier joueur privé de ses points et de 5 vies.
- Clonage à 3 points sert aussi d'échappatoire défensive : il efface toutes les attaques entrantes en plus de copier un adversaire.
- Espionnage perd beaucoup de valeur avec des actions entièrement publiques : la main adverse se reconstitue par déduction. Concerne aussi Espion-Voleur.
- L'auto-pioche d'un joueur inactif rapporte 1 point par tour au V1. Avec un futur kit à Pioche 4, s'absenter deviendrait rentable.
