#!/bin/bash
set -x -e

OUTPUT_PATH=""
HAIL_VERSION="master"
SPARK_VERSION="2.3.0"
IS_MASTER=false

PY="/build/distributions/hail-python.zip"
JAR="/build/libs/hail-all-spark.jar"

if grep isMaster /mnt/var/lib/info/instance.json | grep true;
then
  IS_MASTER=true
fi

while [ $# -gt 0 ]; do
    case "$1" in
    --output-path)
      shift
      OUTPUT_PATH=$1
      ;;
    --hail-version)
      shift
      HAIL_VERSION=$1
      ;;
    --spark-version)
      shift
      SPARK_VERSION=$1
      ;;
    -*)
      error_msg "unrecognized option: $1"
      ;;
    *)
      break;
      ;;
    esac
    shift
done

function install_prereqs()
{
  export PATH=$PATH:/usr/local/bin

  sudo yum update -y --skip-broken
  sudo yum install -y g++ cmake git

  sudo yum install -y lz4
  sudo yum install -y lz4-devel

  sudo yum install -y python36
  sudo yum install -y python36-devel
  sudo yum install -y python36-setuptools
  sudo easy_install pip

  sudo python -m pip install --upgrade pip
  wget https://bootstrap.pypa.io/get-pip.py
  # Install latest pip
  sudo python3 get-pip.py
  sudo python get-pip.py
  # Upgrade latest latest pip
  sudo python -m pip install --upgrade pip
  sudo python3 -m pip install --upgrade pip
  rm -f get-pip.py

  WHEELS="pyserial
  decorator
  oauth
  argparse
  parsimonious
  wheel
  pandas
  utils
  numpy
  scipy
  requests
  bokeh"

  for WHEEL_NAME in $WHEELS
  do
    sudo python3 -m pip install $WHEEL_NAME
  done
}

function download_hail_build()
{
  echo "Checking if binaries are available for download from $PATH"

  P=`aws s3 ls $OUTPUT_PATH/hail-python.zip | sed -e 's/^[ \t]*//' | cut -d " " -f 1`
  J=`aws s3 ls $OUTPUT_PATH/hail-all-spark.jar | sed -e 's/^[ \t]*//' | cut -d " " -f 1`

  if [ ! -z $P ] && [ ! -z $J ]; then
    aws s3 cp $OUTPUT_PATH/hail-python.zip $PWD$PY
    aws s3 cp $OUTPUT_PATH/hail-all-spark.jar $PWD$JAR
    RET=true
  else
    RET=false
  fi
}

function build_hail()
{
  echo "Building Hail v.$HAIL_VERSION from source with Spark v.$SPARK_VERSION"

  git clone https://github.com/broadinstitute/hail.git
  cd hail/hail/
  git checkout $HAIL_VERSION
  
  J_PATH=`dirname "/usr/lib/jvm/java-1.8.0-openjdk-1.8.0*/include/."`
  if [ -z $J_PATH]; then
    echo "Java 8 was not found"
    exit 1
  else
    sudo ln -s $J_PATH /etc/alternatives/jre/include
  fi

  if [ $SPARK_VERSION = "2.2.0" ]; then
    ./gradlew -Dspark.version=$SPARK_VERSION shadowJar archiveZip
  else
    ./gradlew -Dspark.version=$SPARK_VERSION -Dbreeze.version=0.13.2 -Dpy4j.version=0.10.6 shadowJar archiveZip
  fi
}

function install_hail()
{
  echo "Installing Hail locally"

  echo "" >> $HOME/.bashrc
  echo "export PYTHONPATH=\${PYTHONPATH}:$HOME/hail-python.zip" >> $HOME/.bashrc
  echo "export PYSPARK_PYTHON=python3" >> $HOME/.bashrc
  cp $PWD$PY $HOME
  cp $PWD$JAR $HOME
}

function save_to_s3()
{
  echo "Saving compiled Hail binaries to S3"

  aws s3 cp $PWD$PY $OUTPUT_PATH/`basename $PY`
  aws s3 cp $PWD$JAR $OUTPUT_PATH/`basename $JAR`
}

if [ "$IS_MASTER" = true ]; then
  install_prereqs
  download_hail_build
  if [ $RET = false ]; then
    build_hail
    save_to_s3
  fi
  install_hail
else
  install_prereqs
fi
