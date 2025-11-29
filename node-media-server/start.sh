set -e  # Exit immediately on error

echo "Starting Node Media Server at $ENV_MODE..."

if [ "$ENV_MODE" = "development" ]; then
    node index.js
else
    pm2-runtime start index.js --name node-media-server
fi