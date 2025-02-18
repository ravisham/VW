#!/usr/bin/perl

$VERSION = '0.4.4'; # Modified 29Dec2016 by Troy Conrad <troy.conrad@mirumagency.com>

use JSON::PP;
use Term::ANSIColor;

######### DEFINE PROJECT-SPECIFIC VALUES #########

# AWS ECR docker repo info

$dockerRepo = '943150032479.dkr.ecr.us-east-1.amazonaws.com'; # docker repo to deploy from
$dockerTag  = 'dev-shop'; # docker image to deploy
$dockerService = 'tc-dev-visionwheel-shop'; # service to deploy as

# AWS ECS cluster, service and task info

$environment  = 'qa';           # server environment type ('qa' or 'production')
$cluster      = 'visionwheel-prod';             # ECS cluster to deploy to
$service      = $dockerService; # service to deploy as (MUST ALREADY EXIST)
$taskName     = $dockerTag;             # name for task service will provide

$deployURL    = "https://dev-api.visionwheel.com/";

$buildNumber = $GIT_REV_NUM; # get Git Revision number

# JSON string of properties of docker container(s) in task
$taskDefinition = <<END_OF_FILE;
{
  "executionRoleArn": "ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "$dockerTag",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "prod"
        }
      },
      "portMappings": [
        {
          "containerPort": 8080
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "$environment"
        },
        {
          "name": "GIT_REVISION_NUMBER",
          "value": "$buildNumber"
        }
      ],
      "environmentFiles": [
        {
          "value": "arn:aws:s3:::vw-ecs-envfiles/ATT17797.env",
          "type": "s3"
        }
      ],
      "memoryReservation": 4096,
      "image": "$dockerRepo/$dockerTag:latest",
      "essential": true,
      "name": "$dockerTag" 
    }
  ],
  "memory": "4096",
  "family": "$taskName",
  "requiresCompatibilities": [
      "FARGATE"
  ],
  "networkMode": "awsvpc",
  "cpu": "2048"
}
END_OF_FILE

######### DEFINE ENVIRONMENT VALUES #########

#$awsCmd    = '/usr/local/bin/aws --profile aws-visionwheel';         # aws cli shell command
$awsCmd ='/usr/local/bin/aws --profile default';     #aws cli shell command
$dockerCmd = 'docker '; # docker cli shell command
$verbose   = 1;             # 1 = more verbose logging

#####################################
######### BEGIN MAIN SCRIPT #########
#####################################

print "\n", color('bold blue'), "✔ ecs-deploy $VERSION started.\n", color('reset');

$deployInfo = "docker image '$dockerTag' as task '$taskName' in service '$service' to cluster '$cluster'";
print color('bold'), "Deploying $deployInfo.\n\n", color('reset');

### COLLECT REQUIRED INFO ###

# check for required values
for ( qw( dockerTag dockerRepo cluster service taskName taskDefinition ))
{
  ${$_} or die "The \$$_ variable must be defined.\n";
}


$password = runCmd( "/usr/local/bin/aws ecr get-login-password" );

# get Amazon ECR login command
$dockerLoginCmd = "docker login -u AWS -p ${password}";
chomp( $dockerLoginCmd );
$dockerLoginCmd = "$dockerLoginCmd $dockerRepo";

if ($dockerLoginCmd =~ /docker login/) # success
{
  # prefix result with 'sudo ' & trim newline
  chomp( $dockerLoginCmd = "$dockerLoginCmd" );
}
else { die "Failed to retrieve ECR docker login command from the AWS CLI."; }
### BUILD DOCKER IMAGE ###

print color('bold blue'), "• Building '$dockerTag' docker image...\n", color('reset');

# build docker image from Dockerfile in repo
# OLD # runCmd( "$dockerCmd build -t $dockerTag ." , $verbose );

#runCmd( "docker.sh" );
#runCmd( "$dockerCmd build -f site/Dockerfile -t $dockerTag ." , $verbose );
#runCmd( "$dockerCmd build -f site/Dockerfile.prod -t $dockerTag ." , $verbose );

runCmd( "$dockerCmd build -f site/Dockerfile.prod  --memory='4g' --memory-swap='4g' -t $dockerTag ." , $verbose );


### PUSH IMAGE TO DOCKER REPO ###

print color('bold blue'), "• Pushing docker image to repo...\n", color('reset');

# tag built docker image
runCmd( "$dockerCmd tag $dockerTag:latest $dockerRepo/$dockerTag:latest" , $verbose );

# log into the AWS ECR docker registry
runCmd( $dockerLoginCmd , $verbose );

# push tagged image to the AWS ECR docker registry
runCmd( "$dockerCmd push $dockerRepo/$dockerTag:latest" , $verbose );

### UPDATE AWS ECS TASK DEFINITION ###

print color('bold blue'), "• Updating ECS task definition with latest image...\n", color('reset');

# init a JSON<->Perl converter object for later use
$json = JSON::PP->new->ascii->canonical->pretty->allow_nonref;

# create task definition file

# filename for the task definition file
$taskDefinitionFile = 'taskDefinition.json';

open $TASKFILE, '>', $taskDefinitionFile
  or die "Cannot open $taskDefinitionFile: $OS_ERROR";

# write out the data
print $TASKFILE $taskDefinition
  or die "Cannot write to $taskDefinitionFile: $OS_ERROR";

# be neat and close file
close $TASKFILE
  or die "Cannot close $taskDefinitionFile: $OS_ERROR";

# register the updated task definition to AWS ECS
# no verbose since output is explicitly handled.
$resultJson = runCmd( "$awsCmd ecs register-task-definition --cli-input-json file://$taskDefinitionFile" , $verbose );

### UPDATE AWS ECS SERVICE ###

print color('bold blue'), "• Updating running ECS service...\n", color('reset');

# update the running ECS service with the latest task definition
# no verbose since output is explicitly handled.
$resultJson = runCmd( "$awsCmd ecs update-service --cluster $cluster --service $service --task-definition $taskName --force-new-deployment" );

# recreate JSON text block, omitting all but 3 latest event entries (for readability)
$resultRef = $json->decode($resultJson); # convert JSON to native perl hash

$eventsRef = $resultRef->{service}->{events}; # get events

$resultRef->{service}->{events} = [ # overwrite original with only top 3
  $eventsRef->[0],
  $eventsRef->[1],
  $eventsRef->[2]
];

print $json->encode($resultRef); # print as JSON

$runningCount = $resultRef->{service}->{runningCount};

print "\n" , color('bold');

sleep 10; # let site settle before announcing it's live

if ($runningCount)
{
  print color('green'), "✔ Deploy complete!", color('reset'), "\n";
  print "The site is now live at $deployURL\n";
}
else
{
  die color('red'), "Could not deploy latest $taskName to $cluster cluster!", color('reset'), "\n";
}

######### COMMON FUNCTIONS #########

sub runCmd
{
  my($cmd,$verbose) = @_;
  print color('bold'), "Running '$cmd'...\n", color('reset');
  my $cmdOut = `$cmd`;
  $verbose && print "$cmdOut\n";
  my $exitCode = $? >> 8; # Binary right shift
  die "Error running '$cmd': $OS_ERROR" if $exitCode;
  $cmdOut;
}
