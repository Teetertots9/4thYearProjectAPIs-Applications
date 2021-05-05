die () {
  [ -n "$1" ] && echo "$1" >&2
  exit 1
}

function header () {
  echo ""
  echo "*********************************"
  echo -e "* $1"
  echo "*********************************"
  echo ""
}

function deploy(){
    function=$1
    header "Deploying $stage"
    terraform init
    terraform apply -auto-approve
}

: ${stage:=dev}

cd "terraform/infrastructure/$stage"

deploy