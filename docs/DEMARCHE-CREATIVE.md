# Démarche créative

> Ce document est rédigé **par l'équipe humaine**, sans IA générative (exigences DES-01 à DES-03). Le nom, le logo et le choix des couleurs viennent de l'étudiant ; l'assistant n'a fait que corriger l'orthographe, mettre en forme le texte et relever les valeurs techniques (codes de couleurs, polices, licences).

## Nom du projet

**KeyMine.**

Le but est de créer un site qui attire les jeunes des écoles. Pour ça, je voulais partir d'un jeu qui est déjà très populaire chez eux : ça peut attirer l'attention de plusieurs élèves d'un coup et ça donne un côté amusant au site. « Key » (les touches du clavier) et « Mine » (le minage de Minecraft) racontent en deux mots que c'est un jeu de frappe, avec l'univers des jeux vidéo.

## Logo

![Logo KeyMine](logo/keymine-logo.png)

**L'idée.** J'aime beaucoup les pixels, et Minecraft est un jeu entièrement fait de pixels (de gros blocs carrés). C'est ce qui m'a amené à faire un logo en pixels : il est dans le même univers que le nom, et il se reconnaît tout de suite dans le style du site.

**Comment je suis arrivé au logo final.**

1. **Premier essai, avec des lettres seulement.** J'avais d'abord testé un logo avec juste le mot « KEY » en grandes lettres sur un fond de blocs d'herbe verts, avec une pioche grise et un cercle noir autour. Je n'étais pas fan du résultat, alors j'ai cherché autre chose.
2. **Le texte en vrai pixel art.** J'ai écrit le mot « KEYMINE » à l'aide d'un convertisseur de texte en pixel art (BatchImageTools) : on dessine les lettres avec des 0 et des 1 dans une grille, puis on donne une couleur à chaque chiffre. J'ai mis « KEY » en blanc et « MINE » en or. Là, le côté bloc de Minecraft ressortait enfin.
3. **L'assemblage dans Canva.** J'ai ensuite tout assemblé dans Canva : un fond vert uni, un cercle noir, le texte pixel au centre, une pioche en or pour le côté « mine », et des touches de clavier **W A S D** (les touches avec lesquelles on se déplace dans Minecraft). Au début j'avais seulement une touche W, puis j'ai ajouté A, S et D pour former le vrai bloc de déplacement.
4. **Résultat.** La pioche et les touches se rejoignent au-dessus du texte : on lit « clavier » et « Minecraft » dans la même image. Et oui, c'est une pioche en or, qui est la plus forte en couleur et la plus nulle dans le jeu (mais ça va bien avec le jaune du site 🙂).

**Variantes et usages.**

- Version complète (`logo/keymine-logo.png`, 1024 × 768) : pour les documents et les présentations.
- Version carrée recadrée sur le cercle (`logo/keymine-icone.png`) : pour l'icône de l'onglet du navigateur (favicon, `app/favicon.ico` et `app/icon.png`).
- Dans l'en-tête du site, je n'ai pas remis l'image entière : le mot est reconstitué avec de petites touches de clavier (K, E, Y) suivies de « MINE », pour rester lisible et léger sur téléphone.

## Moodboard

_À compléter par l'étudiant : références visuelles collectées (captures ou images, avec la source de chacune)._

## Palette de couleurs

Je suis parti du **vert** et du **jaune/or** : ce sont les couleurs fortes de Minecraft (l'herbe, les creepers, et l'or de la pioche). Le reste vient de la terre et du bois du jeu : un brun foncé pour le fond, un beige crème pour les panneaux. Un rouge franc sert uniquement pour les actions dangereuses.

| Rôle | Couleur | Code |
| --- | --- | --- |
| Fond du site (thème sombre) | brun terre | `#2B1E13` (plus foncé : `#1B1209`) |
| Fond du site (thème clair) | sable | `#CDBF9C` (plus foncé : `#A8966E`) |
| Panneaux et cartes | crème | `#F1E6C9` |
| Panneaux, gris de touches | gris pierre | `#C6C6C6`, ombre `#6B6B6B` |
| Action principale (jouer, créer, démarrer) | vert | `#3F7D24` (clair `#7FC45A`, foncé `#23501A`) |
| Herbe, accents verts | vert herbe | `#5E9C3A` |
| Accent, mise en valeur, bouton « modifier » | or | `#F0B429` (clair `#FFE08A`, foncé `#9A6B0A`) |
| Danger (supprimer, fermer la salle, lettre interdite) | rouge | `#B0281C` (clair `#F39A8C`, foncé `#5E140D`) |

**Les couleurs du logo** sont un peu à part, parce que je l'ai fait dans Canva : le fond vert est `#4A6F28`, le jaune du mot « MINE » et de la pioche est `#F5C542`, le contour est noir (`#000000`) et les touches sont gris très clair (`#E3E4E8`). Elles sont proches de celles du site (même vert, même or) sans être exactement les mêmes ; je préfère garder le logo tel que je l'ai dessiné.

**Contrastes.** Je les ai vérifiés avec le rapport de contraste WCAG (il faut au moins 4,5 pour du texte normal) : crème sur brun terre 13,0 ; or sur brun terre 8,7 ; blanc sur le vert des boutons 5,0 ; blanc sur le rouge 6,6 ; texte foncé sur les panneaux crème 12,0. De plus, le test d'accessibilité automatique (axe-core) ne relève aucune erreur de contraste sur les pages principales, en thème sombre comme en thème clair.

Toutes ces couleurs sont écrites **une seule fois**, en variables CSS au début de `app/globals.css` : pour changer l'ambiance du site, on modifie ces lignes et tout suit.

## Typographies

Deux polices, toutes les deux libres, installées en local dans `app/fonts/` (le site ne dépend donc pas d'un service externe) :

| Police | Rôle | Auteur | Licence |
| --- | --- | --- | --- |
| **Press Start 2P** | titres, boutons, étiquettes en majuscules, chiffres du code de salle : tout ce qui doit « sonner » jeu vidéo d'arcade | CodeMan38 | SIL Open Font License 1.1 |
| **VT323** | texte courant, descriptions, saisie, texte à taper en course : un pixel plus fin, qui reste lisible en gros paragraphe | Peter Hull | SIL Open Font License 1.1 |

Je les ai trouvées sur Google Fonts. Elles ont toutes les deux un look écran d'ordinateur à pixels, qui va bien avec le logo. La licence OFL permet de les utiliser, les copier et les redistribuer dans un projet, y compris avec le site, à condition de garder leur licence ; la source est donc indiquée ici.

Pourquoi deux polices : Press Start 2P est très large et fatigue vite à lire sur plusieurs lignes, alors je l'utilise pour les mots courts (boutons, titres). Dès qu'il y a une phrase à lire ou un texte à taper, je passe à VT323, qui est plus étroite et plus claire.

## Application dans l'interface

- **Le style « bloc ».** Boutons, panneaux et touches ont des bords carrés, une bordure noire épaisse, un petit relief (un côté clair en haut à gauche, un côté foncé en bas à droite) et une ombre dure qui ne se floute pas. Ça donne l'impression de blocs en pixels, comme dans Minecraft. Au survol, un bouton se soulève un peu ; quand on clique, il s'enfonce, pour que ça réagisse comme une vraie touche.
- **Les couleurs ont toujours le même sens.** Vert = on avance (jouer, créer, enregistrer). Or = action secondaire ou à remarquer (générer un lien, modifier les réglages). Rouge = on supprime ou on ferme. Gris = annuler ou fermer sans rien changer. La même logique sert pour les touches des lettres et des accents dans le formulaire de création : gris = neutre, vert = « souvent », rouge = « jamais ». Et la couleur n'est jamais seule : une petite marque (+ ou ×) et un trait sur le texte aident les personnes qui ne voient pas bien les couleurs.
- **Thème sombre et thème clair.** Le thème sombre (fond brun terre, panneaux crème) est celui que j'ai pensé en premier. Le thème clair garde les mêmes panneaux sur un fond sable. Le site choisit selon le choix de la personne, sinon selon la préférence de son appareil, et le thème est posé avant l'affichage de la page pour éviter un flash de la mauvaise couleur. Un bouton dans l'en-tête permet d'alterner.
- **L'en-tête et le logo.** Les lettres K, E et Y sont de petites touches de clavier (la touche E est verte), comme dans le logo, suivies de « MINE ». L'icône de l'onglet du navigateur est le logo rond.
- **Sur téléphone.** Les pages tiennent sans défilement horizontal à 360 px de large : les grilles de boutons passent en une colonne, et les grandes cartes (touches du clavier) défilent à l'intérieur de leur zone.
