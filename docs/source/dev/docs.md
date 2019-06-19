# Update and Build Documentation

These docs are hosted at https://readthedocs.io. The documentation is built using Sphinx with Markdown support enabled. In order to translate, the documentation must first be in the base (English) language. Upon a successful build, the translatable files (.pot) are then pushed to [Transifex](https://www.transifex.com/). The pot files must be synchronized with Transifex for editors to use them.

## Simple Build

Install prerequisites (see below). Then to do a build:
```sh
make html
```

## Sphinx Extensions

Python extensions are required to build the docs, including `sphinx_markdown_tables` for tables to render. The `.readthedocs.yaml` file in the root of the repo sets which version of Python (3.7) and the location of the requirements file in `docs/requirements.txt`.

For more on how markdown tables can render correctly see: https://pypi.org/project/sphinx-markdown-tables/

## Update Sources for Translation

This is from the [rtd docs](https://docs.readthedocs.io/en/latest/guides/manage-translations.html#update-sources-to-be-translated) with minor changes for folder names.

This should be done if content changes in the base language documentation.

Create the `.pot` files. 
```
cd docs
sphinx-build -b gettext source build/gettext -l fr
sphinx-intl update -p build/gettext -l fr
```

If a page is created it needs to be added to `.tx/config` by using `tx init` mapping and then pushed to Transifex. For example
```
# try
tx config mapping --resource facility-recon.docs_build_gettext_dev_dhis2users \
--source-lang en --type PO --source-file docs/build/gettext/dev/dhis2users.pot \
--expression 'docs/source/locales/<lang>/LC_MESSAGES/dev/dhis2users.po'
# add --execute to do it if all looks well
tx config mapping --resource facility-recon.docs_build_gettext_dev_dhis2users \
--source-lang en --type PO --source-file docs/build/gettext/dev/dhis2users.pot \
--expression 'docs/source/locales/<lang>/LC_MESSAGES/dev/dhis2users.po' --execute
```

Push files to Transifex.
```
tx push -tl fr
```


## Build Documentation from New Translations

```
tx pull -l fr
```

Next git add, commit, push the changes to the repository master branch. Then rebuild the English and French projects on readthedocs.org.


## Update Base (English) Documentation

> Note: Python 3.x is expect in the Makefile.

Install prerequisites:
```sh
pip install sphinx
pip install recommonmark
pip install sphinx_rtd_theme
pip install sphinx-intl
pip install transifex-client
pip install sphinx_markdown_tables
```

Clone the respository, create a branch, and enter the docs directory. (If you are not a maintainer, please fork, branch, then send a pull request.)

```sh
git clone https://github.com/openhie/facility-recon.git
cd facility-recon/docs
```

Build the documentation. There is no need to commit documentation builds. The `.gitignore` includes the built documentation so built docs will not be committed by default. readthedocs builds the hosted documentation itself.

Build docs in default (English) language.
```sh
make html
```

Built docs will go in the `/docs/build` directory. Open `/docs/build/index.html` in a browser to see the built docs.


## Transifex Setup

Transifex provides an accessible interface for contributors to enter and correct translations. The workflow is explained at [readthedocs](https://docs.readthedocs.io/en/latest/guides/manage-translations.html).

Setup an account on transifex.com. Be added to the OpenHIE organization for facility-recon project. Obtain a token in user settings and initialize transifex command line client. You do not need to `tx init` the directly, as the `.tx/config` should be version control. Setup a $TFX_TOKEN environment variable for yourself.


## Create Translation Intermediate Files for New Languages

In the /docs directory, create the locale files. Use the appropriate [locale](http://www.sphinx-doc.org/en/master/usage/configuration.html#confval-language). Note that Sphinx supports less locales than Transifex.
```
sphinx-intl update -p build/gettext -l es
```

## How Localization was done (Do Not Reproduce)

Do not replicate this process. It is here to document how it was done in the first place. Doing it again would delete or write over translations or remove them.

* Setup Sphinx for the project. Enable Markdown support. Setup readthedocs.org. Enable the webhook to trigger builds.
* Create the source language docs. 
* Create projects in readthedocs.org for both the source language (facility-recon - no prefix/suffix) and the new one (facility-recon-fr)
* Set languages correctly on both projects.
* Assign the -fr project as a translation of the source. You must have two projects.


Create gettest dir. `source` is required as the `conf.py` file is not in the docs directory.
```sh
sphinx-build -b gettext source build/gettext
```

Create `.pot` files for French. This puts a locales directory in `/docs/source/` and creates files for every `.md` and `.rst` file.
```sh
cd docs
sphinx-intl update -p build/gettext -l fr
```

Init Transifex support for the repo. Do it from the repo root, not docs. Add a Transifex API token env var prior to doing this.
```sh
# must be in repo root
cd ../
tx init --token $TFX_TOKEN --no-interactive
```

Bulk-map all of the documents. This must be done in the root of the repo.
```sh
# must be in repo root
tx config mapping-bulk --project facility-recon --file-extension '.pot' --source-file-dir docs/build/gettext \
    --source-lang en --type PO --expression 'docs/source/locales/<lang>/LC_MESSAGES/{filepath}/{filename}.po' --execute
```

Do the initial push of the source language documents to Transifex.
```sh
tx push --source
```

Test by translating and editing a few files on Transifex. Pull from Transifex.
```
tx pull -l fr
```

Manually check the `.po` files translated to confirm the changes.

Build locally to check. (FYI, this puts `.mo` files into the repo which could potentially be gitignored and removed.)

```sh
cd docs
sphinx-build -b html -D language=fr ./source build/html/fr
```
...then open the index.html in the built files for French to confirm.

readthedocs.io should rebuild based on the existing webhook.
