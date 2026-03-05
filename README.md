# ⚽ Big Match Manager — by Joy Zogo

> Application web de gestion de championnat de football de quartier.
> Gérez vos matchs, suivez les scores, les statistiques, le classement des joueurs et les sanctions disciplinaires.

---

## 🚀 Déploiement sur GitHub Pages

### Étapes rapides

1. **Créer un dépôt GitHub**
   - Allez sur [github.com](https://github.com) → **New Repository**
   - Nommez-le : `bigmatch-manager` (ou ce que vous voulez)
   - Visibilité : **Public** (requis pour GitHub Pages gratuit)

2. **Uploader les fichiers**
   ```
   bigmatch-manager/
   ├── index.html
   ├── style.css
   ├── script.js
   └── README.md
   ```

3. **Activer GitHub Pages**
   - Allez dans **Settings** → **Pages**
   - Source : **Deploy from a branch**
   - Branch : `main` / `root`
   - Cliquez **Save**

4. **Votre URL sera :**
   ```
   https://[votre-username].github.io/bigmatch-manager/
   ```

---

## 📁 Structure des fichiers

```
bigmatch-manager-github/
├── index.html     → Structure HTML, modals, navigation
├── style.css      → Design complet (couleurs, typographie, responsive)
├── script.js      → Logique JavaScript (données, tri, stats, auth)
└── README.md      → Ce guide
```

---

## 🔐 Connexion et Rôles

| Rôle | Permissions | Mot de passe (démo) |
|------|-------------|---------------------|
| **Super Administrateur** | Accès complet (ajout, modification, suppression) | `SuperAdmin2025!` |
| **Organisateur Rouge** | Voir et gérer l'équipe Rouge uniquement | `RougeFC@2025` |
| **Organisateur Blanc** | Voir et gérer l'équipe Blanche uniquement | `BlancFC@2025` |
| **Observateur** | Consultation seule, aucune modification | `Observe2025` |

> ⚠️ **Sécurité** : Les mots de passe ne sont **jamais stockés en clair** dans le code client. Ils sont vérifiés via une fonction de hachage côté JavaScript. Pour une production réelle, utilisez un backend sécurisé.

> 💡 **Personnalisation** : Pour changer les mots de passe, modifiez les valeurs dans `script.js` dans la section `_AUTH`, en remplaçant les chaînes hashées.

---

## ✨ Fonctionnalités

### 🏠 Tableau de Bord
- Statistiques rapides : matchs joués, victoires, buts totaux, sanctions
- Dernier match en vedette avec score et gagnant
- Top 5 buteurs et passeurs en un coup d'œil

### 📋 Tableau des Matchs
- Toutes les colonnes : Date, Jour (auto), Équipes, Scores, Lieu, Type, Statut, Notes
- **Tri automatique** par date (plus récent en haut par défaut)
- **Bouton "Trier / Inverser"** pour changer l'ordre
- Clic sur les en-têtes pour trier par n'importe quelle colonne
- Recherche en temps réel
- Badges colorés pour statuts et types
- Modification et suppression selon le rôle

### 📊 Statistiques par Équipe
- Victoires, Défaites, Nuls
- Buts Marqués, Buts Encaissés
- Filtré selon l'équipe connectée

### 🏆 Top Joueurs
- **Top 15 mensuel** ou **Top 10 hebdomadaire**
- Classement buteurs avec médailles (🥇🥈🥉)
- Classement passeurs
- Formulaire d'enregistrement des statistiques

### 🚨 Sanctions Disciplinaires
- Tableau : Joueur, Équipe, Matchs sanctionnés, Motif, Date
- Ajout, modification, suppression
- **Génération de résumé** trimestriel ou annuel
- Impression du résumé

---

## 🎨 Design

| Élément | Couleur |
|---------|---------|
| Fond principal | Vert football clair |
| Équipe Rouge | Rouge `#d32f2f` + blanc |
| Équipe Blanc | Bleu `#1565c0` + blanc |
| Équipes extérieures | Orange `#e65100` |
| En-têtes | Vert foncé `#1a3d1a` |
| Texte | Noir `#0d0d0d` |

---

## 💾 Stockage des données

Les données sont stockées dans le **localStorage** du navigateur.
- ✅ Fonctionne sans serveur
- ✅ Données persistantes entre sessions
- ✅ Parfait pour GitHub Pages
- ⚠️ Les données sont locales à chaque navigateur/appareil

---

## 📱 Responsive

L'application est optimisée pour :
- 📱 Mobile (320px+)
- 💻 Tablette (768px+)
- 🖥️ Desktop (1280px+)

---

## 🛠️ Technologies utilisées

- **HTML5** — Structure sémantique
- **CSS3** — Variables CSS, Flexbox, Grid, animations
- **JavaScript ES6+** — Vanilla JS, localStorage, hashage
- **Google Fonts** — Barlow Condensed + Lato

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
