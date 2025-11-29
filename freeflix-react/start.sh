set -e  # Exit immediately on error

echo "React runnning at $ENV_MODE..."

if [ "$ENV_MODE" != "development" ]; then
    npm run build 
fi