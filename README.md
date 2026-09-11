# Tri Photo Albums — prototype V1

Application web/PWA pour créer et gérer des albums virtuels pCloud depuis un PC ou un téléphone, sans déplacer, renommer ni dupliquer les fichiers originaux.

## Fonctions V1

- connexion OAuth pCloud ;
- navigation dans les dossiers pCloud ;
- affichage des vignettes via l’API pCloud ;
- sélection de photos/vidéos ;
- création de Collections pCloud ;
- ajout à une Collection existante ;
- consultation des albums ;
- lien de partage d’album avec mot de passe optionnel.

## Sécurité

Aucune fonction de suppression, déplacement ou renommage de fichiers pCloud n’est présente dans cette V1. Le jeton OAuth est conservé uniquement dans le stockage local du navigateur et les appels API utilisent l’en-tête `Authorization: Bearer ...`.

## Déploiement

Ce dépôt est prévu pour GitHub Pages. Une fois Pages activé sur la branche `main` et le dossier `/ (root)`, l’application sera accessible via :

`https://hypnohelping-arch.github.io/tri-photo-albums/`

Cette URL devra ensuite être utilisée comme `redirect_uri` de l’application créée dans pCloud Developers > My Apps.
