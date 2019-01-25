# How to Build and Update Documentation

These docs are hosted in readthedocs.io. The documentation is built using Sphinx with markdown support enabled. In order to translate, the documentation must first be in the base (English) language. Upon a successful build, the translatable files (.pot) are then pushed to [Transifex](https://www.transifex.com/). The pot files must be synchronized with Transifex for editors to use them.

## Update Sources for Translation

This is from the [rtd docs](https://docs.readthedocs.io/en/latest/guides/manage-translations.html#update-sources-to-be-translated) with minor changes for folder names.

This should be done if content changes in the base language documentation.

Create the `.pot` files. 
```
cd docs
sphinx-build -b gettext source build/gettext
```

Push files to Transifex.
```
tx push -tl fr
```

## Build Documentation from New Translations

``
tx pull -l fr
``

git add, commit, and push.







## Update Base (English) Documentation

> Note: Python 3.x is expect in the Makefile.

Install prerequisites:
``sh
pip install sphinx
pip install recommonmark
pip install sphinx_rtd_theme
pip install sphinx-intl
pip install transifex-client
```

Clone the respository, create a branch, and enter the docs directory. (If you are not a maintainer, please fork, branch, then send a pull request.)

```
git clone https://github.com/openhie/facility-recon.git
cd facility-recon/docs
```

Build the documentation. There is no need to commit documentation builds. The `.gitignore` includes the built documentation so built docs will not be committed by default. readthedocs builds the hosted documentation itself.

Build docs in default (English) language.
```
make html
```

Built docs will go in the `/docs/build` directory. Open `/docs/build/index.html` in a browser to see the built docs.

## Create and Translation Intermediate Files (.pot)

Transifex provides an accessible interface for contributors to enter and correct translations. The workflow is explained at [readthedocs](https://docs.readthedocs.io/en/latest/guides/manage-translations.html).

Setup an account on transifex.com. Be added to the OpenHIE organization for facility-recon project. Obtain a token in user settings and initialize transifex command line client.

Change directory to the root of the repo.

```
tx init --token $TFX_TOKEN --no-interactive
```

This will create a `$HOME/.transifexrc` and `.tx` folder in the current (repo root) directory.


## Pull Existing Translations

> Note. Make sure to pull existing translations otherwise you may write over other's work.
Pull existing translations.
```
tx pull --all
```


## Create Translation Intermediate Files for New Languages

In the /docs directory, create the locale files. Use the appropriate [locale](http://www.sphinx-doc.org/en/master/usage/configuration.html#confval-language). Note that Sphinx supports less locales than Transifex.
```
sphinx-intl update -p build/gettext -l es
```

## Push Updates in English for Translation

This should be done if there are changes to base (English) documentation.
```
tx push --source
```


## Troubleshooting

If the `.tx/config` needs to be reconfigured, then do a bulk update.
```sh
# must be in root of the repo
tx config mapping-bulk --project facility-recon --file-extension '.pot' --source-file-dir docs/build/gettext \
    --source-lang en --type PO --expression 'docs/locales/<lang>/LC_MESSAGES/{filepath}/{filename}.po' --execute
```