if [ "$JEKYLL_ENV" = "production" ]
then
    jekyll build
else
    jekyll build --drafts
fi
