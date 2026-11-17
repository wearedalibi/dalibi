# Assistant d'installation web

Dalibi fournit un **assistant d'installation** façon « première configuration » (comme WordPress) :
sur une base vierge, il applique le schéma, pose les données de référence de production, crée
l'établissement, l'administrateur et l'année scolaire active, applique les réglages de sécurité,
puis **verrouille** l'application. Aucune ligne de commande n'est requise.

## Prérequis

- Le fichier `.env` renseigné : connexion base de données + `APP_KEY` (`php artisan key:generate`).
- Le serveur lancé (`php artisan serve` et `npm run dev`, ou un build de production).

> Avant installation, l'application bascule automatiquement les stores `session` et `cache` sur le
> pilote **`file`** : les tables `sessions` et `cache` n'existent pas encore sur une base neuve.

## Accès

Tant que l'application n'est pas installée, **toute requête est redirigée vers `/install`**. Ouvrez
simplement la racine du site : l'assistant démarre.

## Les étapes

| # | Étape | Contenu |
|---|-------|---------|
| 1 | **Langue** | Fixe la langue de l'assistant **et** de l'application (FR / EN). Les écrans suivants et toute l'interface basculent immédiatement. |
| 2 | **Administrateur** | Compte principal (prénom, nom, e-mail, mot de passe). Le mot de passe applique la **politique de l'app** : min. 12 caractères, casse mixte, chiffres, symboles, et vérification contre les fuites connues (HaveIBeenPwned) en production. |
| 3 | **Sécurité** | HTTPS forcé (hors environnement local), mode debug coupé en production, journalisation des erreurs (Sentry). La **2FA n'est pas imposée** : chaque utilisateur l'active dans ses réglages. |
| 4 | **École** | Identité de l'établissement, regroupée par sections : **Identité** (nom, code, monnaie, devise/slogan), **Direction & contact** (directeur, e-mail, téléphone), **Localisation** (pays, région, ville, boîte postale, adresse), **Organisation pédagogique** (niveaux, année académique, découpage des périodes, description). |

### Monnaie, devise et pays

Trois notions distinctes, souvent confondues :

- **Monnaie** (`currency`) — code ISO de la devise monétaire (ex. `XOF` pour le FCFA), pour l'affichage des montants.
- **Devise / slogan** (`devise`) — l'exergue de l'école (ex. « Travail - Liberté - Patrie »), affichée sur les documents officiels.
- **Pays** (`country`) — code ISO 3166-1 du pays de l'établissement (défaut : Togo). La liste provient de `App\Constants\Countries` (source unique, également utilisée par le `CountrySeeder`).

### Niveaux multiples

Une école peut cocher **un ou plusieurs cycles** (maternelle, primaire, collège, lycée, lycée
technique). Ils sont rattachés comme **types de classe** (relation `School::classTypes`) après le
seed. La colonne `level` conserve le cycle principal (le plus bas coché) pour compatibilité.

## Exécution

À la validation de la dernière étape, l'assistant lance l'installation réelle, dans cet ordre :

1. `migrate --force` — schéma de base de données.
2. Création de l'**école** (champs du modèle `School`).
3. `db:seed --class=ReferenceDataSeeder` — rôles & permissions, catalogues, pays, types de classe, en-têtes/bulletins par défaut.
4. Rattachement des **types de classe** correspondant aux niveaux cochés.
5. Découpage des périodes (trimestre / semestre), **année scolaire active**.
6. Création de l'**administrateur** (rôle `administrateur`), défini comme **propriétaire** (`owner_id`) de l'école.
7. Application des réglages de **sécurité** (écriture best-effort dans `.env`).
8. Pose du **verrou** (`storage/app/installed.json`).

Chaque étape est **idempotente** (migrations et seeders rejouables, créations via
`firstOrCreate`/`firstOrNew`) : en cas d'échec, l'écran de progression propose de **relancer** sans
créer de doublon.

## Verrouillage

Une fois installée, l'application **se verrouille** : toute visite de `/install` redirige vers la
connexion.

> La **source de vérité** de l'état « installé » est la **base** (présence d'utilisateurs). Le
> fichier-verrou `storage/app/installed.json` n'est qu'un **cache**, reconstruit automatiquement
> s'il manque alors que la base contient déjà des données.

Pour **réinstaller** (environnement de test) : videz la base (ou `php artisan migrate:fresh`) et
supprimez `storage/app/installed.json`.

## Durcissement de sécurité

L'assistant intègre plusieurs protections :

- Le mot de passe administrateur applique `Password::default()` (politique de l'app).
- Le mot de passe **ne transite jamais en clair** en session : il est chiffré (`APP_KEY`) jusqu'à
  l'exécution, puis purgé ; la base reste l'unique stockage final, en haché.
- Les routes de l'assistant sont **limitées en débit** (`throttle`).
- Les journaux d'erreur **masquent** le SQL et ses bindings (pas de fuite d'e-mail ou de données).
- Après écriture du `.env`, le cache de configuration est purgé (`config:clear`).

## Alternative en ligne de commande

Pour un déploiement automatisé (CI, Docker, provisioning), contournez l'assistant :

```bash
php artisan migrate
php artisan db:seed --class=ReferenceDataSeeder
```

Créez ensuite l'administrateur et l'école depuis l'application, ou via vos propres seeders.
