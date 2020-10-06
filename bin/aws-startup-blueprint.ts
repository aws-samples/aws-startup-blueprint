#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { AwsStartupBlueprintStack } from '../lib/aws-startup-blueprint-stack';

const app = new cdk.App();
new AwsStartupBlueprintStack(app, 'AwsBiotechBlueprint', {
    description: "The AWS Biotech Blueprint is a strongly opinionated architecture for any Startup looking to start using AWS follwing best practices on day 1. (qs-1of009lua)"
});
