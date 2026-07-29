# Spec de règles — Bataille des cartes (jeu vidéo)

## 1. Ressources et fondations

### Ressources

- **Vies** : détermine si un joueur reste en jeu. À 0, le joueur est éliminé.
- **Points** : monnaie d'usage, servant entre autres à utiliser des cartes, à acheter ou vendre des cartes, et à acheter des points d'amélioration.
- **Points d'amélioration** : permet d'améliorer une carte de façon définitive et unique pour la partie. Coût d'achat : 10 points. Revente : 7 points. (Ce coût peut être modifié par certaines capacités spéciales de kit — voir section Kits.)
- **Bouclier** : capital de points additionnel protégeant le joueur ; détruit quand il atteint 0.

### Dégâts et pertes de vie

- **Dégâts** désigne spécifiquement la perte de vie infligée par une carte de type attaque (cartes d'attaque de base, et toute carte spéciale explicitement définie comme une attaque — ex. MEGA Attaque, voir section Cartes spéciales).
- Le bouclier absorbe uniquement les dégâts, avant les vies du joueur. Si les dégâts dépassent les points de bouclier restants, l'excédent est reporté sur les vies du joueur.
- Toute autre perte de vie (coût d'une carte comme Taxe, effet comme Suicide, Poison, Curse, etc.) n'est pas une attaque : elle n'est pas filtrée par le bouclier et s'applique directement aux vies du joueur.

### Économie des cartes (attaque et action)

- Vendre une carte rapporte son coût d'utilisation en points, sauf mention contraire pour une carte donnée.
- Acheter une carte que l'on ne possède pas coûte le double de son coût d'utilisation. Cet achat provient d'un stock infini, indépendant des cartes vendues ou perdues par des joueurs éliminés.
- Améliorer une carte coûte 1 point d'amélioration, quelle que soit la carte.
- Un joueur peut posséder plusieurs exemplaires d'une même carte.

### Pool partagé

Les cartes vendues, les cartes spéciales utilisées (une carte spéciale n'a qu'une seule utilisation) et les cartes des joueurs éliminés rejoignent un pool commun, visible de tous les joueurs. Ce pool est actuellement exploité uniquement par la carte spéciale Absorbeur de cartes.

### Règle de contre

Une carte qui inflige un effet direct sur un adversaire — c'est-à-dire qui modifie ses ressources ou son état contre son gré (Espionnage, Voleur) — peut être contrée par la même carte jouée en retour contre la source de l'effet : les deux effets s'annulent. Jouer la même carte contre un tiers ne contre rien. Cette règle ne s'applique ni aux cartes d'attaque (voir la règle des attaques mutuelles, section 6), ni aux cartes qui n'infligent aucun effet sur l'adversaire, même quand elles le ciblent pour choisir sur qui agir (Absorbeur : l'utilisateur choisit l'adversaire depuis qui il absorbe, mais celui-ci ne subit aucune conséquence supplémentaire de cette carte), ni aux cartes strictement personnelles (Bouclier, Régénération, Taxe). Miroir suit une mécanique distincte, de redirection en chaîne plutôt que d'annulation (voir section 3).

### Kits

Chaque kit correspond à une carte unique. 15 kits existent actuellement : 14 finalisés et le Duplicateur, en test. Le kit de chaque joueur est distribué aléatoirement en début de partie.

### Nombre de joueurs

Aucune limite définie à ce stade.

### Conditions de victoire

Définies par mode de jeu (voir section Modes de jeu).

## 2. Cartes d'attaque

Une carte d'attaque cible un adversaire au choix et lui inflige des dégâts, réduisant ses vies. Elle suit les règles générales d'Économie des cartes (section 1).

| Carte | Coût | Dégâts (base) | Dégâts (améliorée) |
|---|---|---|---|
| Attaque de base | 1 point | 1 | 3 |
| Attaque moyenne | 2 points | 2 | 4 |
| Super attaque | 10 points | 7 | 10 |

Le ratio coût/dégâts n'est pas linéaire entre les cartes : une attaque à dégâts élevés est un choix de design assumé. Face à une riposte, elle n'est vulnérable qu'à une attaque infligeant exactement les mêmes dégâts (rare à posséder pour une carte coûteuse comme la Super attaque) — toute riposte plus faible est annulée d'office sans l'affecter. Une fois améliorée, elle ne peut être détournée que par un Miroir amélioré.

## 3. Cartes d'action

Les cartes d'action suivent les règles générales d'Économie des cartes (section 1). La Règle de contre (section 1) s'applique à Espionnage et Voleur ; elle ne s'applique pas à Miroir (qui suit sa propre mécanique de redirection en chaîne, détaillée ci-dessous), ni à Absorbeur (qui cible un adversaire mais ne lui inflige aucun effet), ni à Bouclier, Taxe et Régénération (effets strictement personnels).

**Absorbeur** — Prix : 3 points
- Action : l'utilisateur choisit un adversaire ; il gagne toutes les vies que cet adversaire a perdues lors de son dernier coup — son tour complet le plus récent, de son action jusqu'à la fin de sa phase de résolution —, peu importe la cause de cette perte. Ne permet pas d'absorber ses propres vies perdues.
- Amélioration : capture aussi les points et points d'amélioration activement dépensés par cet adversaire lors de son dernier coup (n'inclut pas les points volés par un tiers).

**Espionnage** — Prix : 4 points
- Action : permet de voir le kit et les cartes de l'adversaire pour le reste de la partie. Contrable par un autre Espionnage.
- Amélioration : permet aussi de voir toutes les ressources de l'adversaire.

**Voleur** — Prix : 5 points
- Action : vole 10 points à un adversaire, plafonné au montant que possède la cible. Contrable par un autre Voleur.
- Amélioration : la cible perd toujours le montant volé (plafonné comme en base), mais l'utilisateur gagne le double de ce montant.

**Miroir** — Prix : 6 points
- Action : redirige vers un adversaire au choix une attaque non améliorée destinée à l'utilisateur. Si plusieurs attaques non améliorées sont en attente contre lui, il choisit laquelle rediriger. Ne peut pas rediriger une attaque déjà améliorée. L'attaque redirigée reste une attaque en attente de résolution à part entière, simplement dirigée vers sa nouvelle cible : elle peut être redirigée à nouveau par un autre Miroir, sans limite de chaîne, et si le nouveau joueur ciblé a lui-même une attaque en attente contre l'utilisateur du Miroir, les deux attaques sont évaluées comme des attaques mutuelles entre ces deux joueurs (section 6). Jouer Miroir alors qu'aucune attaque non améliorée n'est en attente contre l'utilisateur est une action invalide, pas une carte gaspillée.
- Amélioration : permet aussi de rediriger des attaques améliorées, et double les dégâts de l'attaque redirigée.

**Bouclier** — Prix : 7 points
- Action : donne 4 points de bouclier. Un joueur ne peut avoir qu'un seul bouclier actif à la fois ; il doit être détruit avant d'en recréer un.
- Amélioration : donne 7 points de bouclier et bloque Voleur et Espionnage sans coût en points de bouclier tant qu'il est actif.

**Taxe** — Prix : 1 vie (ce coût s'applique toujours ; le bouclier ne protège que contre les attaques)
- Action : permet de gagner 4 points.
- Amélioration : permet de gagner 6 points pour la même vie dépensée (toujours 1 vie par utilisation).

**Régénération** — Prix : 3 points par vie, jusqu'à 4 vies par utilisation
- Action : achète jusqu'à 4 vies à 3 points chacune.
- Amélioration : coût réduit à 2 points par vie ; le plafond de 4 vies par utilisation reste inchangé.

## 4. Kits

### Distribution des cartes de départ

Les cartes d'action et d'attaque de départ de chaque kit sont tirées aléatoirement parmi les types disponibles, dans la limite du nombre indiqué pour ce kit. Les doublons sont possibles (un joueur peut démarrer avec plusieurs exemplaires du même type de carte).

### Améliorations de kit

Certains kits appliquent une capacité qui rend un type de carte précis toujours amélioré, pour tous les exemplaires détenus par le joueur, quelle que soit la façon dont ils ont été acquis (distribution de départ, achat en cours de partie, récompense d'élimination, vol). Exemple : le Scientifique a Espionnage toujours amélioré — s'il achète un second Espionnage au tour 12, celui-ci arrive amélioré. Cet état est permanent et gratuit : il ne consomme jamais le stock de points d'amélioration du joueur.

### Roster

| Kit | Vies | Points | Pts d'amélioration | Pioche | Cartes d'action | Cartes d'attaque | Capacité spéciale | Cartes spéciales |
|---|---|---|---|---|---|---|---|---|
| L'Améliorateur | 10 | 0 | 3 | 1 | 4 | 2 | Un point d'amélioration coûte 5 points au lieu de 10 | Voleur de point d'amélioration |
| L'Intouchable | 10 | 0 | 0 | 1 | 5 | 2 | Immunisé à Voleur et Espionnage | Espion-Voleur, Imposition |
| Le Kamikaze | 4 | 9 | 1 | 1 | 7 | 2 | Aucune | Suicide |
| Le Tacticien | 1 | 15 | 0 | 4 | 2 | 2 | Espionnage, Voleur et Miroir déjà améliorés | Blocage |
| L'Indestructible | 18 | 0 | 0 | 1 | 4 | 1 | Taxe et Régénération déjà améliorés | Super Régénération |
| L'Assassin | 10 | 0 | 0 | 1 | 4 | 4 | Peut jouer un nombre illimité de cartes d'attaque dans le même tour, tant qu'il a les points nécessaires. Chaque attaque cible un adversaire au choix (la même cible ou des cibles différentes). Chaque attaque conserve sa résolution indépendante. | Sentence, Générateur de points |
| Le Prophète | 10 | 4 | 2 | 1 | 5 | 2 | Aucune | 2 cartes spéciales aléatoires, tirées dans le pool complet de toutes les cartes spéciales existantes |
| La Spécialiste | 8 | 4 | 0 | 1 | 3 | 2 | Absorbeur déjà amélioré | 2 Transformateurs de carte, Voleur de carte, Super Absorbeur |
| Le Scientifique | 10 | 0 | 0 | 1 | 5 | 2 | Espionnage déjà amélioré | Clonage |
| Le Fantôme | 14 | 0 | 0 | 1 | 4 | 2 | Chaque vie que ce joueur perd, peu importe la cause, lui fait gagner 2 points | Curse |
| La Sorcière | 10 | 0 | 1 | 1 | 5 | 2 | Voleur déjà amélioré | Réanimation, Poison |
| Le Guerrier | 10 | 0 | 0 | 1 | 3 | 3 | Toutes les attaques déjà améliorées | Absorbeur de cartes |
| Le Magicien | 10 | 4 | 0 | 2 | 4 | 2 | Voleur déjà amélioré | MEGA Attaque |
| Le Mastodonte | 14 | 4 | 1 | 1 | 4 | 2 | Bouclier déjà amélioré | Super Miroir |
| Le Duplicateur (en test) | 2 | 0 | 0 | 1 | 1 | 0 | Duplication activable — voir détail ci-dessous | Imposition, Voleur d'attaques |

### Duplicateur — détail de la capacité

- À son tour, le Duplicateur peut choisir d'activer sa duplication **au lieu de** jouer une action normale (piocher, jouer/vendre/acheter une carte, acheter un point d'amélioration). L'activation est anticipée : elle couvre les gains du tour de table qui suit (jusqu'au tour suivant du Duplicateur), pas les gains déjà obtenus avant l'activation. Elle n'a aucun coût en ressources — son seul coût est d'occuper l'action du Duplicateur pour ce tour, au lieu d'une action normale.
- *Hypothèse de rééquilibrage à tester en priorité (non validée par playtest) : passer ses vies de départ de 2 à 6 et ses cartes d'action de départ de 1 à 2. Raison : le passage d'une duplication passive à active a supprimé son garde-fou de survie sans compensation ailleurs — il risque de mourir avant d'avoir pu activer sa capacité une seule fois.*
- Une fois activée, il reçoit une copie de toutes les vies, tous les points et tous les points d'amélioration gagnés par tous les adversaires — peu importe la source de ce gain (y compris un gain issu d'un vol comme Voleur ou Espion-Voleur, ou d'une récompense d'élimination). C'est une copie : l'adversaire garde son gain, le Duplicateur en reçoit l'équivalent.
- Les cartes ne sont jamais dupliquées, quelle que soit leur origine.
- S'il joue une autre action à son tour plutôt que d'activer la duplication, aucun gain n'est dupliqué durant l'intervalle qui suit — l'activation n'est pas permanente, elle doit être renouvelée à chaque tour du Duplicateur pour rester active.
- Si plusieurs joueurs ont le kit Duplicateur dans la même partie, ils s'excluent mutuellement pour les gains obtenus via leur propre pouvoir de duplication (pas de boucle) : seuls les gains actifs d'un Duplicateur (obtenus directement par ses propres actions, pas ceux reçus par duplication) sont dupliqués par un autre Duplicateur.

## 5. Cartes spéciales

### Règles générales

- Une carte spéciale ne peut pas être achetée ou vendue individuellement. Il est possible de payer 20 points pour obtenir une carte spéciale aléatoire (le joueur ne choisit pas laquelle).
- Une carte spéciale n'a qu'une seule utilisation. Comme pour les cartes d'attaque et d'action, l'améliorer coûte 1 point d'amélioration. Une amélioration posée avant utilisation est perdue une fois la carte jouée.
- Une carte spéciale à effet persistant (activée une fois puis active jusqu'à une condition de désactivation) est définitivement perdue une fois désactivée, au même titre que toute autre carte spéciale.
- Quatre cartes (Générateur de points, Poison, Super Absorbeur, Imposition) sont associées à un **compteur interne dédié** ("vies de carte"), indépendant du bouclier de combat : il ne protège pas l'utilisateur (les dégâts continuent de l'atteindre normalement, en suivant les règles habituelles de bouclier/vies). En parallèle, à chaque fois que l'utilisateur perd une vie à cause d'un dégât, ce compteur perd aussi 1 point. Quand il atteint 0, la carte se désactive et est définitivement perdue. Valeurs de départ du compteur : Générateur de points 3, Poison 3, Super Absorbeur 2, Imposition 2.

### Liste des cartes

**Voleur de point d'amélioration** — Prix : 5 points
- Action : vole tous les points d'amélioration non dépensés de tous les adversaires, et fait perdre l'amélioration de toutes leurs cartes actuellement améliorées, y compris celles dont l'amélioration provient d'une capacité de kit permanente. Chaque amélioration ainsi perdue transfère 1 point d'amélioration à l'utilisateur ; la victime ne récupère rien. Cet effet ne retire que l'amélioration des exemplaires détenus au moment où la carte est jouée : si une capacité de kit rend un type de carte toujours amélioré, tout nouvel exemplaire acquis ensuite (achat, récompense d'élimination, vol) arrive de nouveau amélioré normalement.
- Amélioration : vole en plus tous les points actuels de tous les adversaires.

**Espion-Voleur** — Prix : 5 points
- Action : vole tous les points de tous les adversaires (sans plafond), et espionne tous les adversaires (comme Espionnage, pour le reste de la partie).
- Amélioration : tous les points volés sont doublés ; permet aussi de voir toutes les ressources de tous les adversaires.

**Suicide** — Prix : 3 points
- Action : l'utilisateur est éliminé à son tour suivant. Tous les adversaires perdent 5 vies et tous leurs points. Si cet effet élimine tous les adversaires, l'utilisateur est déclaré vainqueur. Aucune récompense n'est attribuée à personne pour ces éliminations, y compris celle de l'utilisateur lui-même.
- Amélioration : l'utilisateur n'est plus éliminé par sa propre carte. Il est considéré comme l'éliminateur de chaque adversaire tué par cet effet, et reçoit les récompenses correspondantes normalement.

**Blocage** — Prix : 5 points
- Action : annule toute action en attente de résolution contre l'utilisateur, puis celui-ci joue 3 tours consécutifs (les autres joueurs attendent). Il peut jouer n'importe quelle action durant ces tours, sauf des cartes d'attaque.
- Amélioration : 7 tours consécutifs au lieu de 3.

**Super Régénération** — Prix : 6 points
- Action : gagner 9 vies.
- Amélioration : gagner 18 vies.

**Sentence** — Prix : 15 points
- Action : élimine un joueur choisi aléatoirement parmi tous les joueurs en jeu, y compris potentiellement l'utilisateur lui-même.
- Amélioration : l'utilisateur ne peut plus être choisi par sa propre carte.

**Générateur de points** — Prix : 5 points
- Action : génère 2 points par tour pour l'utilisateur, tant que le compteur interne dédié de la carte (voir Règles générales) n'est pas épuisé.
- Amélioration : génère 4 points par tour.

**Voleur de carte** — Prix : 5 points
- Action : l'utilisateur choisit l'adversaire ciblé ; il lui vole une carte aléatoire. Si cet adversaire est actuellement espionné (Espionnage actif sur lui), l'utilisateur peut choisir précisément quelle carte voler au lieu d'un tirage aléatoire.
- Amélioration : vole une carte à chaque adversaire (même exception si un adversaire est espionné).

**Transformateur de carte** — Prix : 2 points
- Action : l'utilisateur transforme une carte d'action ou d'attaque de son choix, en sa possession, en une carte spéciale aléatoire.
- Amélioration : permet de choisir la carte spéciale obtenue plutôt qu'un tirage aléatoire.

**Clonage** — Prix : 3 points
- Action : l'utilisateur devient un clone d'un adversaire au choix : même kit, mêmes vies, points, points d'amélioration, bouclier et cartes (y compris cartes spéciales restantes). Remplace entièrement l'état précédent de l'utilisateur. Cette action annule tous les effets en attente dirigés contre l'utilisateur ; il n'hérite d'aucun effet en attente dirigé contre le joueur cloné. Toute visibilité acquise par Espionnage (ou équivalent) est remise à zéro dans les deux sens : celle que l'utilisateur possédait sur d'autres joueurs, et celle que d'autres possédaient sur lui.
- Amélioration : gagne en plus 10 points, 2 points d'amélioration et 4 vies.

**Invisibilité** — Prix : 10 points
- Action : l'utilisateur devient immunisé à toute action adverse et pioche 4 points par tour tant que l'invisibilité est active. Doit être désactivée manuellement par l'utilisateur (pas de condition automatique).
- Amélioration : pioche 6 points par tour.

**Réanimation** — Prix : 8 points
- Action : à l'activation, si l'utilisateur est éliminé plus tard dans la partie, il est réanimé avec un kit aléatoire et ses ressources de départ, comme en début de partie, au lieu d'être éliminé définitivement.
- Amélioration : permet de choisir le kit de réanimation plutôt qu'un tirage aléatoire.

**Absorbeur de cartes** — Prix : 4 points
- Action : récupère 4 cartes aléatoires depuis le pool partagé (cartes vendues, cartes spéciales utilisées, cartes de joueurs éliminés).
- Amélioration : permet de choisir les 4 cartes récupérées plutôt qu'un tirage aléatoire.

**MEGA Attaque** — Prix : 16 points
- Action : attaque tous les joueurs de la partie de 20 dégâts. C'est une carte de type attaque (le bouclier s'applique normalement). Peut être détournée uniquement par un Miroir amélioré.
- Amélioration : ne peut plus être détournée du tout.

**Super Miroir** — Prix : 7 points
- Action : redirige vers tous les adversaires chaque attaque actuellement en attente de résolution contre l'utilisateur, chacune indépendamment — chaque adversaire subit les dégâts de chacune des attaques ainsi redirigées (pas une seule attaque combinée). Ces attaques redirigées ne peuvent plus être détournées par un Miroir classique, mais peuvent l'être par un autre Super Miroir.
- Amélioration : double les dégâts des attaques ainsi redirigées.

**Super Absorbeur** — Prix : 8 points
- Action : absorbe tous les points, vies et points d'amélioration dépensés par tous les adversaires, tant que le compteur interne dédié de la carte n'est pas épuisé.
- Amélioration : double tous les gains ainsi obtenus.

**Curse** — Prix : 8 points
- Action : l'utilisateur choisit un adversaire à maudire ; celui-ci perd 1 vie pour chaque 3 points qu'il dépense à son tour. L'effet se désactive dès que la victime tombe à 1 vie restante (il ne peut pas l'achever).
- Amélioration : 1 vie perdue par 2 points dépensés au lieu de 3.

**Poison** — Prix : 8 points
- Action : tous les adversaires perdent 1 vie par tour, tant que le compteur interne dédié de la carte n'est pas épuisé.
- Amélioration : 2 vies perdues par tour au lieu d'1.

**Imposition** — Prix : 6 points
- Action : à chaque tour, chaque adversaire doit céder 2 points à l'utilisateur ; s'il n'a pas assez de points, il cède 1 vie à la place, que l'utilisateur gagne (soumis au plafond de vies du mode de jeu). Effet actif tant que le compteur interne dédié de la carte n'est pas épuisé.
- Amélioration : 4 points ou 2 vies au lieu de 2 points ou 1 vie.

**Voleur d'attaque** — Prix : 8 points
- Action : bloque, une seule fois, toute attaque visant l'utilisateur, et vole une carte d'attaque aléatoire à chaque adversaire.
- Amélioration : vole toutes les cartes d'attaque de tous les adversaires.

## 6. Déroulement d'une partie et résolution

### Distribution

1. Chaque joueur reçoit un kit, tiré aléatoirement (section 4).
2. Chaque joueur reçoit les ressources de départ de son kit (vies, points, points d'amélioration).
3. Chaque joueur reçoit ses cartes d'attaque et d'action de départ, tirées aléatoirement selon les quantités de son kit (doublons possibles, section 4).
4. Chaque joueur reçoit ses cartes spéciales de kit.
5. L'ordre de jeu est déterminé, puis la partie commence.

### Visibilité

Restent privés : le kit de chaque joueur, le contenu de sa main, et la valeur exacte de ses ressources — sauf effet spécifique (Espionnage et équivalents). Toute action jouée est publique, identité de la carte comprise, y compris les achats, ventes, améliorations et pioches. La file des effets en attente de résolution est publique.

### Tour de jeu

- Un joueur ne peut faire qu'une seule action par tour, que ce soit une action classique (piocher, jouer/vendre/acheter une carte, acheter un point d'amélioration) ou l'utilisation d'une carte spéciale — sans exception, sauf dérogation explicite d'un kit ou d'une carte (ex. Assassin, Blocage).
- Piocher : le joueur gagne un nombre de points égal à la valeur "Pioche" de son kit (section 4). C'est tout ce que fait cette action — elle ne fait gagner aucune carte, malgré son nom.
- Une action visée sur un adversaire prend effet au tour suivant de cet adversaire, jamais avant. Un joueur ne peut donc jamais subir de perte de vie ou de ressource en dehors de son propre tour.
- Le tour d'un joueur n'est considéré terminé qu'une fois qu'il a joué son unique action. Les actions en attente de résolution qui le visent ne se résolvent qu'**après** qu'il a joué cette action — ce qui lui laisse une chance de réagir avant que les effets ne s'appliquent (riposter, acheter des vies, utiliser Miroir, etc.). Exemple : le joueur A attaque le joueur B (2 vies) avec une Super attaque. B ne meurt pas automatiquement en arrivant à son tour : il joue d'abord son action (par exemple Régénération pour gagner des vies), puis l'attaque de A se résout. Si son action ne modifie ni n'annule l'attaque, elle s'applique alors normalement.
- Les effets périodiques visant un adversaire (Poison, Curse, Imposition) suivent la même logique : ils se déclenchent au tour de la cible, après que celle-ci a joué son action.

### Attaques mutuelles

Quand deux attaques se visent mutuellement entre deux joueurs et sont toutes deux encore en attente de résolution, la comparaison se fait au tour du joueur qui a riposté : si les deux attaques infligent exactement les mêmes dégâts, elles s'annulent toutes les deux. Si les dégâts diffèrent, l'attaque la plus faible est annulée d'office ; l'attaque la plus forte continue vers sa résolution normale, au tour de sa propre cible.

Une attaque redirigée par Miroir reste une attaque en attente à part entière : si le joueur vers qui elle est redirigée a lui-même une attaque en attente contre celui qui l'a redirigée, ces deux attaques sont évaluées comme des attaques mutuelles entre eux, selon la même règle. Exemple : le joueur A attaque le joueur C, et le joueur B attaque aussi le joueur C avec la même carte. Au tour de C, celui-ci utilise Miroir pour rediriger l'attaque de A vers B. L'attaque de B contre C et l'attaque de A redirigée par C vers B s'affrontent comme des attaques mutuelles entre B et C, et s'annulent puisqu'elles infligent les mêmes dégâts.

### Élimination

- Un joueur éliminé perd toutes ses vies. Il devient spectateur ; toutes ses cartes non réclamées comme récompense rejoignent le pool partagé (section 1).
- L'éliminateur choisit deux récompenses parmi : 4 vies, 8 points, une carte au choix parmi celles du joueur éliminé (y compris ses cartes spéciales non utilisées), ou un point d'amélioration. Les deux choix peuvent être identiques (ex. deux fois "4 vies").
- Quand un même effet élimine plusieurs joueurs à la fois, l'éliminateur reçoit deux récompenses par joueur éliminé, cumulables.
- Un joueur éliminé sans éliminateur tiers — par le coût en vie de Taxe, par sa propre Sentence, par son propre Suicide non amélioré — ne génère aucune récompense pour personne.
- *Cas de plusieurs éliminateurs simultanés : la récompense revient à celui qui a le moins de vies restantes parmi les éliminateurs. En cas d'égalité, celui qui a le moins de points. En cas de nouvelle égalité, tirage aléatoire entre les éliminateurs à égalité.*

## 7. Modes de jeu

### Limite de vies

Chaque mode impose un plafond de vies : un joueur ne peut jamais dépasser ce nombre, quelle que soit la source du gain (tout gain excédentaire au-delà du plafond est perdu).
- Classique : 25 vies
- Jeu en équipe : 25 vies
- Partie rapide : 20 vies
- Mode Dieu : aucune limite

### Mode Classique

Chacun pour soi. Dernier joueur en vie gagne.

### Jeu en équipe

- Mêmes règles que le mode Classique, par équipes.
- Ordre de jeu entièrement individuel, comme en mode Classique : chaque joueur joue son tour à tour de rôle dans une rotation globale, sans regroupement par équipe. L'appartenance à une équipe détermine uniquement les interactions autorisées, pas l'ordre de jeu.
- Un joueur ne peut pas attaquer un coéquipier.
- Un joueur ne peut pas donner directement des cartes ou des ressources à un coéquipier. Actions d'entraide autorisées : lui acheter des vies (Régénération), lui créer un bouclier, lui acheter une carte, lui acheter un point d'amélioration, rediriger vers lui une attaque qui ne le vise pas initialement (Miroir et Super Miroir peuvent cibler un allié plutôt que l'utilisateur lui-même dans ce mode), ou utiliser Taxe à son propre coût pour lui reverser les points obtenus.
- Objectif : éliminer tous les joueurs des autres équipes, en gardant au moins un joueur en vie dans sa propre équipe.

### Mode Dieu

- Un joueur est désigné aléatoirement comme le Dieu — un rôle spécial distinct des 15 kits normaux.
- Tous les autres joueurs sont alliés contre le Dieu, sous les mêmes règles d'entraide que le Jeu en équipe.
- Aucune récompense d'élimination dans ce mode.
- Vies de départ du Dieu selon le nombre d'adversaires (mode plafonné à 6 joueurs adverses) :

| Adversaires | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|
| Vies du Dieu | 10 | 15 | 20 | 25 | 30 |

- Le Dieu démarre avec 2 points d'amélioration, 9 points, pioche 2 points, toutes les cartes d'action et toutes les cartes d'attaque existantes, et 4 cartes spéciales aléatoires.
- Toutes ses cartes d'attaque et d'action standard sont déjà améliorées dès le départ. Ses 2 points d'amélioration ne servent qu'à améliorer ses cartes spéciales, s'il le souhaite.
- Clonage ne peut pas cibler le Dieu.
- Objectif : le Dieu doit éliminer tous les autres joueurs ; les autres joueurs doivent éliminer le Dieu.

### Partie rapide

- Toutes les attaques (y compris MEGA Attaque) infligent le double de leurs dégâts habituels.
- Compatible avec tous les autres modes de jeu.
