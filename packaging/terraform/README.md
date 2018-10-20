# terraform

* Create an account on DO and upload a public SSH key and note your API token.
* Export a `DIGITALOCEAN_TOKEN` variable with your API token.
* Get the hash fingerprint that DO generated for your SSH key (this is a DO thing).
```sh
curl -X GET -H "Content-Type: application/json" -H "Authorization: Bearer $DO_TOKEN" "https://api.digitalocean.com/v2/account/keys"
```
* Export a `TF_VAR_fingerprint` variable with the hash.
* Get the latest droplet instances and sizes, you'll need the awesome [jq](https://stedolan.github.io/jq/) parser for JSON installed.
```sh
curl -X GET --silent "https://api.digitalocean.com/v2/images?per_page=999" -H "Authorization: Bearer $DO_TOKEN" > droplets.json
curl --silent -X GET "https://api.digitalocean.com/v2/sizes" -H "Authorization: Bearer $DO_TOKEN" | jq '.sizes[].slug' > sizes.json
```
* Adjust droplet config as you wish using info from the above.
* Profit!
```sh
terraform init
terraform apply
terraform state pull | jq --raw-output
```
Clean up.
```
terraform destroy
```
