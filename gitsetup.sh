# ---- CONFIG ----
GITHUB_USER="gwgr"
REPO_NAME="garmin-platform"
GIT_NAME="Greg Rowntree"
GIT_EMAIL="YOUR_GITHUB_EMAIL"

# ---- SET GIT IDENTITY ----
git config --global user.name "$GIT_NAME"
git config --global user.email "$GIT_EMAIL"

# ---- INITIALIZE REPO ----
git init
git branch -M main

# ---- CREATE DOCS STRUCTURE ----
mkdir -p docs

# move docs if they exist in root
mv prd.md docs/ 2>/dev/null || true
mv implementation.md docs/ 2>/dev/null || true
mv dev_deployment.md docs/ 2>/dev/null || true
mv tasks.md docs/ 2>/dev/null || true

# ---- CREATE GITIGNORE ----
cat > .gitignore <<'EOF'
.env
__pycache__/
*.pyc
node_modules/
.next/
dist/
data/
postgres-data/
.DS_Store
EOF

# ---- ADD FILES ----
git add .

# ---- COMMIT ----
git commit -m "Initial project documentation"

# ---- CREATE GITHUB REPO AND PUSH ----
gh repo create "$GITHUB_USER/$REPO_NAME" \
  --public \
  --source=. \
  --remote=origin \
  --push

echo "Repository successfully created and pushed."

