if [ "$JEKYLL_ENV" = "production" ]
then
    hugo
else
    hugo --buildDrafts
fi
