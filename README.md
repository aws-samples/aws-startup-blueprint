# AWS Startup Blueprint

This is a strongly opinionated CDK architecture built for Startups looking to follow AWS best practices on Day 1. 

![Blueprint Diagram](http://devspacepaul.s3.us-west-2.amazonaws.com/startupblueprints/BlueprintDiagram.png)

## Install instructions

If you just want to get the above working in your account ASAP, download the [pre-synthed CloudFormation Template](https://raw.githubusercontent.com/aws-samples/aws-startup-blueprint/mainline/cdk.out/AwsStartupBlueprintStack.template.json) and use the AWS CloudFormation web console to deploy it.

If you value the principles of infrastructure as code and want to manage/adapt/update the architecture over time using code, its best to clone this repository and manage the architecture as you would any CDK application.

```bash
git clone GITURLGOESHERE
npm run build 
cdk bootstrap
```

Once that completes, to deploy or update the blueprint's architecture, you just need to run 

```bash 
npm run build && cdk deploy
```

## Connect to the VPN

In order for you to route into the private subnets in the VPCs, you need to connect to the VPN. The blueprint has deployed a client vpn endpoint in the management vpc that will NAT traffic over peering connections into the production and development vpcs. We are using the managment VPC as a hub VPC for networking into other VPCs. The development and production envioronments are designed to NOT be able to communicate with each other.

(http://devspacepaul.s3.us-west-2.amazonaws.com/startupblueprints/VPNRoutingDiagram.png)

Once the deployment is complete, go to the AWS VPC web console, and scroll down to the "Client VPN Endpoints" section. Select the Client VPN Endpoint listed and click the "Download Client Configuration" button. Your browser will download a `downloaded-client-config.ovpn` file.

Now go to the AWS S3 web console and open the bucket prefixed `awsstartupblueprintstack-clientvpnvpnconfigbucket*`. You will see 5 files listed. Download the `client1.domain.tld.key` and `client1.domain.tld.crt`. The other three files are the CA chain and server key/cert. You will need those if you want to create additional client certificates later on. For now, you just need `client1.domain.tld.key` and `client1.domain.tld.crt`.

At this point we have to edit make some tweaks to the `downloaded-client-config.ovpn` file so open it in a text editor:

Find this line: 

```
remote cvpn-endpoint-0randomdigitsf.prod.clientvpn.us-west-2.amazonaws.com 443
```

And update it to: 

```
remote corp.cvpn-endpoint-0randomdigitsf.prod.clientvpn.us-west-2.amazonaws.com 443
```

Finally, add the following lines to the bottom of the file:

```
<cert>
Contents of client certificate (client1.domain.tld.crt) file
</cert>

<key>
Contents of private key (client1.domain.tld.key) file
</key>
```

Save the `downloaded-client-config.ovpn`. You should be able to open/import that file with any OpenVPN client. You can find instructions for using the [AWS VPN Client](https://docs.aws.amazon.com/vpn/latest/clientvpn-user/connect-aws-client-vpn-connect.html) or the [official OpenVPN client](https://docs.aws.amazon.com/vpn/latest/clientvpn-user/connect.html) for Mac/Windows/Linux on our docs pages.

## Where to go from here?

Here is what a conventional n-tier application might look like in the Blueprint architecture.

(http://devspacepaul.s3.us-west-2.amazonaws.com/startupblueprints/BlueprintDiagramSAAS.png)


## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.


