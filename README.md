# ⚽ Big Match Manager — Google Apps Script
### by Joy Zogo ABAGA

> Version **Google Apps Script** de Big Match Manager.  
> Interface web complète connectée à **Google Sheets** en temps réel.  
> Un seul fichier `Code.gs` contient le backend (serveur) ET le frontend (interface).

---

## 🚀 Déploiement — Étape par Étape

### 1️⃣ Créer un projet Apps Script

1. Allez sur **[script.google.com](https://script.google.com)**
2. Cliquez sur **"Nouveau projet"**
3. Renommez le projet : `Big Match Manager`

### 2️⃣ Coller le code

1. Supprimez le contenu de `Code.gs`
2. Copiez **tout le contenu** de `Code.gs` fourni
3. Collez-le dans l'éditeur
4. **Ctrl+S** pour sauvegarder

### 3️⃣ Déployer en tant qu'application web

1. Cliquez sur **"Déployer"** → **"Nouveau déploiement"**
2. Cliquez sur ⚙️ à côté de "Type" → choisissez **"Application Web"**
3. Configurez :
   - **Description** : `Big Match Manager v1`
   - **Exécuter en tant que** : `Moi`
   - **Qui a accès** : `Tout le monde` (ou "Tout le monde dans votre organisation")
4. Cliquez **"Déployer"**
5. Autorisez les permissions demandées par Google
6. **Copiez l'URL** de déploiement fournie

### 4️⃣ Initialiser la base de données

1. Ouvrez l'URL de déploiement dans votre navigateur
2. Connectez-vous en tant que **Super Administrateur**
3. Sur la page d'accueil, cliquez sur **"⚙️ Initialiser les feuilles Google Sheets"**
4. Les 4 feuilles sont créées automatiquement avec des données exemples

---

## 📊 Feuilles Google Sheets créées automatiquement

| Feuille | Colonnes | Description |
|---------|----------|-------------|
| **MATCHS** | ID, DATE, HEURE, EQUIPE_A, EQUIPE_B, SCORE_A, SCORE_B, LIEU, TYPE, STATUT, NOTES | Tous les matchs |
| **JOUEURS** | ID, JOUEUR, EQUIPE, BUTS, PASSES, MOIS, SEMAINE | Statistiques joueurs |
| **SANCTIONS** | ID, JOUEUR, EQUIPE, MATCHS_SANCTIONNES, MOTIF, DATE | Sanctions disciplinaires |
| **HISTORIQUE** | HORODATAGE, UTILISATEUR, ACTION, CIBLE, DETAILS | Journal de toutes les modifications |

---

## 🔐 Connexion et Rôles

> **Sécurité** : La vérification du mot de passe se fait **côté serveur** (Apps Script).  
> Les mots de passe ne transitent pas en clair dans le navigateur. La vérification utilise un hachage côté serveur — le DOM client ne contient jamais les mots de passe.

| Rôle | Mot de passe (démo) | Permissions |
|------|---------------------|-------------|
| 👑 **Super Administrateur** | `SuperAdmin2025!` | Accès complet (ajout, modification, suppression) |
| 🔴 **Organisateur Rouge** | `RougeFC@2025` | Matchs et joueurs Équipe Rouge uniquement |
| 🔵 **Organisateur Blanc** | `BlancFC@2025` | Matchs et joueurs Équipe Blanche uniquement |
| 👁 **Observateur** | `Observe2025` | Consultation seule |

### Changer les mots de passe

Dans `Code.gs`, modifiez les hachages dans l'objet `CREDENTIALS`.  
Pour générer un nouveau hachage, utilisez la fonction `_hash()` dans l'éditeur Apps Script :

```javascript
// Dans la console Apps Script (Exécuter > Exécuter la fonction)
function testHash() {
  Logger.log(_hash('MonNouveauMotDePasse'));
}
```

Copiez la valeur dans les logs et remplacez-la dans `CREDENTIALS`.

---

## ✨ Fonctionnalités

### 🏠 Accueil / Dashboard
- Statistiques rapides (matchs joués, victoires, buts, sanctions)
- **Dernier match** en vedette avec score et gagnant
- Top 5 buteurs et passeurs en un coup d'œil
- Bouton d'initialisation (première utilisation)

### 📋 Tableau des Matchs
- Données chargées depuis Google Sheets
- Tri par colonne (clic sur en-têtes)
- **Bouton "Trier / Inverser"** pour inverser l'ordre
- Recherche en temps réel
- Ajout, modification, suppression selon le rôle
- Badges colorés par statut et type

### 📊 Statistiques par Équipe
- Victoires, Défaites, Nuls, Buts Marqués/Encaissés
- Filtré selon l'équipe connectée

### 🏆 Top Joueurs
- Top 15 mensuel ou Top 10 hebdomadaire
- Classement buteurs (🥇🥈🥉)
- Classement passeurs
- Formulaire d'enregistrement des statistiques

### 🚨 Sanctions Disciplinaires
- Tableau avec couleurs selon la gravité (1 → vert, 2 → orange, 3+ → rouge)
- Ajout, modification, suppression
- Génération de résumé trimestriel ou annuel imprimable

### 📜 Historique des Modifications
- Journal complet : toutes les actions (ajout, modification, suppression)
- 100 dernières entrées affichées
- Horodatage, utilisateur, action, détails

---

## 🔄 Mise à jour du déploiement

Après modification du code :

1. **"Déployer"** → **"Gérer les déploiements"**
2. Cliquez sur ✏️ (modifier)
3. **"Version"** → sélectionnez **"Nouvelle version"**
4. Cliquez **"Déployer"**

> ⚠️ L'URL de déploiement reste la même — pas besoin de redistribuer le lien.

---

## 🏗️ Architecture du Code

```
Code.gs
│
├── BACKEND (Google Apps Script)
│   ├── doGet()              → Point d'entrée web app
│   ├── login()              → Authentification sécurisée côté serveur
│   ├── initSheets()         → Création des feuilles Sheets
│   │
│   ├── getMatches()         → Lire tous les matchs
│   ├── addMatch()           → Ajouter un match
│   ├── updateMatch()        → Modifier un match
│   ├── deleteMatch()        → Supprimer un match
│   │
│   ├── getJoueurs()         → Lire les stats joueurs
│   ├── saveStat()           → Ajouter/incrémenter stats
│   │
│   ├── getSanctions()       → Lire sanctions
│   ├── addSanction()        → Ajouter sanction
│   ├── updateSanction()     → Modifier sanction
│   ├── deleteSanction()     → Supprimer sanction
│   │
│   └── getHistorique()      → Lire journal modifications
│
└── FRONTEND (HTML dans getAppHTML())
    ├── Login multi-rôles
    ├── Dashboard / Accueil
    ├── Tableau des matchs (triable)
    ├── Statistiques par équipe
    ├── Top buteurs / passeurs
    ├── Gestion des sanctions
    └── Historique complet
```

---

## ⚡ Différences avec la version GitHub Pages

| Fonctionnalité | GitHub Pages | Google Apps Script |
|---------------|--------------|-------------------|
| Hébergement | GitHub | Google serveurs |
| Données | localStorage (local) | Google Sheets (cloud) |
| Multi-utilisateurs simultanés | ❌ | ✅ |
| Authentification | Côté client (haché) | **Côté serveur** (plus sûr) |
| Historique des modifications | localStorage | Google Sheets |
| Export données | Non | Via Google Sheets |
| Coût | Gratuit | Gratuit (quotas Google) |

---

## 📞 Contact & Signature

**Développé par Joy ZOGO ABAGA**

| Canal | Informations |
|-------|-------------|
| 📧 Email | joyzogo.pro@gmail.com |
| 📞 Téléphone | +241 77 86 67 40 |
| 🐙 GitHub | [github.com/joyzogo](https://github.com/joyzogo) |
| 💼 LinkedIn | [linkedin.com/in/joyzogo](https://linkedin.com/in/joyzogo) |
| 📘 Facebook | [facebook.com/joyzogo](https://facebook.com/joyzogo) |

---

© 2025 **Big Match Manager by Joy Zogo** — Tous droits réservés
