<div align="center">

# SentraGuard

**Prototype local de supervision, détection d'anomalies et journalisation de sécurité**

*Monitoring système · Authentification · Détection de brute force · Alertes · Chiffrement de fichiers*

[**Voir le code**](https://github.com/imane88-lgtm/SentraGuard) · [**Portfolio d'Imane**](https://imane-mrino-portfolio.argus-codex-ai.chatgpt.site/) · [**Profil GitHub**](https://github.com/imane88-lgtm)

</div>


## 01 — Présentation

**SentraGuard** est une application locale de cybersécurité conçue pour rapprocher **observabilité système**, **surveillance d'événements**, **mécanismes élémentaires de détection** et **gestion d'alertes** dans une même interface.

Le projet s'intéresse à plusieurs questions proches de celles rencontrées par une équipe Blue Team : comment reconnaître une succession d'échecs d'authentification, identifier une consommation de ressources anormale, conserver des traces exploitables et organiser la consultation des alertes ?

C'est un **prototype d'apprentissage** : il ne remplace ni un SIEM, ni un EDR, ni un IDS réseau professionnel. Aucun indicateur de performances ou taux de détection n'est annoncé sans test reproductible.

### Objectifs pédagogiques

- Centraliser des métriques système et événements locaux.
- Observer les tentatives d'authentification et appliquer un contrôle simple de brute force.
- Détecter certaines anomalies de CPU/RAM selon des seuils et un historique limité.
- Enregistrer et consulter des alertes avec niveaux de sévérité.
- Explorer le chiffrement de fichiers et la vérification d'intégrité.
- Présenter les données à travers un tableau de bord web local.

## 02 — Fonctionnalités identifiées dans le code

| Module | Éléments vérifiés | Précision |
|---|---|---|
| Authentification | `backend/auth/routes.py`, modèles SQLAlchemy, hachage de mots de passe | Flux API présent, durcissement nécessaire |
| Protection brute force | `backend/ids/brute_force.py` | 5 tentatives dans 60 s → blocage applicatif temporaire de 300 s, stocké en mémoire |
| Détection d'anomalies | `backend/ids/anomaly.py` | Seuils CPU/RAM, pics CPU et fenêtre glissante en mémoire |
| Monitoring | `backend/monitoring/monitor.py` | CPU, RAM, disque, trafic réseau, processus via `psutil` |
| Journal d'alertes | `backend/alerts/alert_manager.py` | Enregistrement SQLAlchemy, consultation et statistiques par sévérité |
| Chiffrement de fichiers | `backend/encryption/aes.py` | AES-GCM, clés locales, dérivation de clé par mot de passe, contrôle SHA-256 |
| Interface web | `frontend/`, `app.py` | Templates et routes Flask ; rendu réel à confirmer |
| Enveloppe bureau | `main.py` | Utilise `webview`, dépendance à ajouter et comportement réseau à sécuriser |
| Simulations | `tests/` | Répertoire présent ; exécution et résultats non vérifiés |

**À ne pas confondre :** le blocage de brute force est une restriction gérée par l'application, **pas** une règle de pare-feu réseau. Les détections d'anomalies ne reposent pas sur un modèle d'apprentissage automatique entraîné.

## 03 — Architecture

![Architecture de SentraGuard](architecture (1).svg)

Le backend Flask distribue ses routes en *blueprints* pour l'authentification, le monitoring, les alertes, l'IDS et le chiffrement. La couche de persistance repose sur SQLAlchemy et SQLite ; plusieurs états de détection restent toutefois **en mémoire** et disparaissent au redémarrage.

### Arborescence fonctionnelle

```text
SentraGuard/
├── app.py                         # Application Flask et enregistrement des blueprints
├── main.py                        # Lanceur bureau (webview)
├── config.py                      # Configuration Flask et SQLite
├── backend/
│   ├── auth/                      # Authentification et modèles
│   ├── monitoring/                # CPU / RAM / disque / processus
│   ├── ids/                       # Brute force et anomalies
│   ├── alerts/                    # Journal des alertes
│   ├── encryption/                # Chiffrement AES-GCM / intégrité
│   ├── logs/                      # Traces d'activité
│   ├── vault/                     # Fonctions de coffre
│   └── comm/                      # Autres fonctionnalités de communication
├── frontend/                      # Templates, CSS et JavaScript
├── tests/                         # Scripts de vérification / simulation
├── docs/                          # Documentation
└── requirements.txt               # Dépendances Python
```

Cette arborescence présente les blocs repérés dans les imports et le dépôt ; elle n'affirme pas que chaque fonctionnalité a été testée de bout en bout.

## 04 — Stack technique

| Outil | Rôle |
|---|---|
| **Python 3** | Logique de détection et d'automatisation |
| **Flask** | Interface web et API |
| **Flask-SQLAlchemy / SQLite** | Persistances des utilisateurs et alertes |
| **Werkzeug** | Hachage et vérification des mots de passe |
| **psutil** | Métriques système et processus |
| **cryptography (AESGCM)** | Chiffrement authentifié de fichiers |
| **HTML / CSS / JavaScript** | Tableau de bord local |
| **webview** | Interface bureau optionnelle ; dépendance non listée actuellement |

Le fichier `requirements.txt` comprend Flask, Flask-Login, Flask-Session, Flask-SQLAlchemy, psutil et cryptography. Le lanceur de bureau importe **`webview`**, qui doit être ajouté à l'environnement si ce mode est utilisé.

## 05 — Installation et démarrage (laboratoire local)

> **Ne pas exposer SentraGuard sur Internet ni sur le réseau d'une entreprise à ce stade.** Le dépôt contient des paramètres de démonstration, des routes à contrôler et un lancement Flask en mode debug dans `app.py`.

```bash
git clone https://github.com/imane88-lgtm/SentraGuard.git
cd SentraGuard
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

### Avant de lancer

1. Remplacer les identifiants de démonstration, si présents, par un compte de test créé localement.
2. Définir une variable d'environnement `SECRET_KEY` robuste et supprimer sa valeur de repli dans `config.py`.
3. Désactiver `debug=True` dans `app.py` et maintenir le serveur sur `127.0.0.1`.
4. Contrôler les droits d'accès aux bases, sessions, journaux et clés de chiffrement.

### Point d'entrée web existant

```bash
python3 app.py
```

L'application vise une interface locale accessible sur `http://127.0.0.1:5000` **après corrections nécessaires**. Cette documentation ne garantit pas que tous les parcours de l'interface fonctionnent dans l'état actuel.

### Mode bureau, à valider séparément

`main.py` utilise `webview` et démarre un serveur Flask dans un thread. Or, le fichier contient deux définitions de `run_flask()` et la seconde utilise une écoute sur toutes les interfaces. Il faut corriger cela avant utilisation, puis installer une version compatible de `pywebview` si souhaité. Le script `launch.sh` contient aussi un chemin personnel codé en dur : le rendre portable.

## 06 — Démonstration SOC proposée

**Scénario 1 — Échecs d'authentification :** dans un environnement local autorisé, provoquer un petit nombre de connexions volontairement erronées sur un compte de test et observer la logique de limitation. Relever la fenêtre de temps, la source IP, le comportement de blocage et la différence entre protection applicative et réseau.

**Scénario 2 — Ressources système :** observer les mesures CPU/RAM, puis simuler une charge **contrôlée et réversible** sur la VM de test, afin de comparer les données brutes aux événements de détection.

**Scénario 3 — Gestion d'une alerte :** créer un événement de test, vérifier son niveau, sa source, sa persistance et sa présence dans l'interface et dans la base de données.

**Scénario 4 — Intégrité d'un fichier factice :** chiffrer puis déchiffrer un document de test non sensible et comparer son empreinte SHA-256 ; ne jamais utiliser de fichiers personnels ou professionnels réels pour ces essais.

### Mini fiche d'investigation

| Élément | Réponse attendue |
|---|---|
| Symptôme | Quel événement inhabituel a été observé ? |
| Source | Quels journaux ou mesures appuient le constat ? |
| Qualification | Alerte pertinente, événement bénin ou incertain ? |
| Impact | Quelles conséquences plausibles ? |
| Action | Surveiller, bloquer au niveau applicatif, documenter, escalader ? |
| Limitation | Qu'est-ce que ce prototype ne permet pas de conclure ? |

## 07 — Tests et preuves à produire

| Validation | Preuve attendue | Statut |
|---|---|---|
| Démarrage web local sans debug | Journal de démarrage anonymisé | À réaliser |
| Authentification et déconnexion | Séquence de test sans exposer les mots de passe | À réaliser |
| Seuil de brute force | Tests aux limites (4/5 tentatives, expiration) | À réaliser |
| CPU/RAM | Valeurs observées avec capture et horodatage | À réaliser |
| Persistance des alertes | Capture du résultat de la base SQLite | À réaliser |
| Chiffrement/déchiffrement | Test sur fichier factice et comparaison SHA-256 | À réaliser |
| Tests automatisés | Commandes, sorties et résultats reproductibles | À réaliser |

Des captures fidèles de l'application pourront ensuite être placées dans `docs/screenshots/`. **Ne pas remplacer ces preuves par des maquettes de dashboard générées artificiellement.**

## 08 — Pertinence pour un stage Cybersécurité / SOC

Pour les activités d'un SOC, ce projet illustre surtout des **concepts de base** :

| Compétence recherchée | Illustration avec SentraGuard |
|---|---|
| Supervision | Collecte de métriques et consultation de l'état local |
| Analyse d'événements | Traces d'authentification et événements IDS simples |
| Détection | Règles de seuil sur échecs de connexion, CPU et RAM |
| Gestion d'alertes | Création, sévérité et archivage en base |
| Documentation | Reproduction des scénarios et qualification des constats |
| Approche Blue Team | Sécuriser le logiciel lui-même et comprendre ses limites |

Ce projet **ne prétend pas démontrer** l'exploitation d'un SIEM Wazuh, une corrélation SOC avancée, un IDS/IPS réseau ni une capacité de réponse à incident en production.

## 09 — Limitations et priorités de correction

**Avant de présenter le projet comme un outil sécurisé :**

- Supprimer la clé secrète Flask de secours présente dans `config.py` et utiliser une valeur d'environnement obligatoire.
- Supprimer les identifiants de démonstration publiés dans l'ancien README ; vérifier qu'ils ne sont utilisés nulle part et renouveler tout secret réel éventuellement exposé.
- Retirer `debug=True` et les écoutes `0.0.0.0` inadaptées à un outil local.
- Réparer les références à `request` dans `app.py` (imports incomplets sur certaines routes).
- Ajouter des contrôles d'authentification/autorisation sur les API sensibles (p. ex. gestion des alertes et chiffrement de chemins de fichiers).
- Vérifier la validation des chemins de fichiers, les permissions de stockage des clés et la confidentialité des journaux.
- Ajouter les dépendances du mode bureau et supprimer le chemin codé en dur dans `launch.sh`.

**Améliorations pédagogiques :**

- Ajouter des tests unitaires autour des seuils de brute force et de leur expiration.
- Persister les événements de sécurité qui sont actuellement conservés en mémoire.
- Séparer les règles IDS des routes Flask et introduire des jeux de données de test.
- Mettre en place un journal d'audit et des règles de classification reproductibles.
- Tester le cas des faux positifs et formaliser une procédure d'escalade.

## 10 — Autrice et liens

**Imane Mrino** — Étudiante en Réseaux, Cloud et Cybersécurité · Orientation SOC / Blue Team

[GitHub](https://github.com/imane88-lgtm) · [LinkedIn](https://www.linkedin.com/in/imane-mrino-899749373/) · [Portfolio](https://imane-mrino-portfolio.argus-codex-ai.chatgpt.site/)

> Projet à vocation pédagogique. Toutes les simulations doivent rester dans un environnement contrôlé avec données fictives. La sécurité réelle du logiciel dépend des corrections, de la configuration, des tests et des revues de code.

