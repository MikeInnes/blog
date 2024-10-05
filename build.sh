if [ "$CF_PAGES_BRANCH" = "master" ]
then
    hugo
else
    hugo --buildDrafts
fi
