import * as apiGateway from '@aws-cdk/aws-apigatewayv2-alpha'
import * as apiGatewayIntegrations from '@aws-cdk/aws-apigatewayv2-integrations-alpha'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import {
  PythonFunction,
  PythonLayerVersion,
} from '@aws-cdk/aws-lambda-python-alpha'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'
import * as s3assets from 'aws-cdk-lib/aws-s3-assets'
import { S3EventSource } from 'aws-cdk-lib/aws-lambda-event-sources'
import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import path from 'path'
import {
  DEPLOY_ENVIRONMENT,
  FRONTEND_BASE_URL,
  STACK_PREFIX,
} from './constants'

class WebsiteBucket extends Construct {
  public readonly bucket: s3.Bucket
  public readonly origin: origins.S3Origin
  public readonly originAccessIdentity: cloudfront.OriginAccessIdentity

  constructor(scope: Construct, id: string) {
    super(scope, id)

    this.bucket = new s3.Bucket(this, `${id}-bucket`, {
      websiteErrorDocument: 'index.html',
      websiteIndexDocument: 'index.html',
      // publicReadAccess: false,
      // blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      publicReadAccess: true,
    })

    this.originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      `${id}-origin-access-identity`
    )
    this.bucket.grantRead(this.originAccessIdentity)

    this.origin = new origins.S3Origin(this.bucket, {
      originAccessIdentity: this.originAccessIdentity,
    })

    new s3deploy.BucketDeployment(this, 'DeployReactApp', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '..', '..', 'out'))],
      destinationBucket: this.bucket,
    })
  }
}

export class PresignedUrlStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const websiteBucket = new WebsiteBucket(this, 'website-bucket')

    const filesBucket = new s3.Bucket(this, id, {
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.POST,
            s3.HttpMethods.PUT,
          ],
          // allowedOrigins: [FRONTEND_BASE_URL],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
    })

    const pythonEntryPoint = path.join(
      __dirname,
      '..',
      'src-python',
      'eventHandler'
    )

    const generateMatchingsLambda = new lambda.DockerImageFunction(
      this,
      'DockerImageFunction',
      {
        functionName: 'generate-matchings',
        timeout: cdk.Duration.seconds(900),
        code: lambda.DockerImageCode.fromImageAsset(pythonEntryPoint),
      }
    )

    filesBucket.grantReadWrite(generateMatchingsLambda)

    generateMatchingsLambda.addEventSource(
      new S3EventSource(filesBucket, {
        events: [s3.EventType.OBJECT_CREATED],
      })
    )

    const httpApi = new apiGateway.HttpApi(this, 'api', {
      description: `___${DEPLOY_ENVIRONMENT}___ Api for ${STACK_PREFIX}`,
      apiName: `${STACK_PREFIX}-api-${DEPLOY_ENVIRONMENT}`,
      corsPreflight: {
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
        ],
        allowMethods: [
          apiGateway.CorsHttpMethod.OPTIONS,
          apiGateway.CorsHttpMethod.GET,
          apiGateway.CorsHttpMethod.POST,
          apiGateway.CorsHttpMethod.PUT,
          apiGateway.CorsHttpMethod.PATCH,
          apiGateway.CorsHttpMethod.DELETE,
        ],
        // allowCredentials: true
        // allowOrigins: [FRONTEND_BASE_URL],
        allowCredentials: false,
        allowOrigins: ['*'],
      },
    })

    const getPresignedUrlFunction = new NodejsFunction(
      this,
      'get-presigned-url',
      {
        runtime: lambda.Runtime.NODEJS_14_X,
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        handler: 'main',
        entry: path.join(__dirname, '/../src/get-presigned-url-s3/index.ts'),
        environment: { BUCKET_NAME: filesBucket.bucketName },
      }
    )

    filesBucket.grantPut(getPresignedUrlFunction)
    filesBucket.grantReadWrite(getPresignedUrlFunction)
    filesBucket.grantPutAcl(getPresignedUrlFunction)

    httpApi.addRoutes({
      path: '/get-presigned-url-s3',
      methods: [apiGateway.HttpMethod.GET],
      integration: new apiGatewayIntegrations.HttpLambdaIntegration(
        'get-url-integration',
        getPresignedUrlFunction
      ),
    })

    new cdk.CfnOutput(this, 'region', { value: cdk.Stack.of(this).region })
    new cdk.CfnOutput(this, 'apiUrl', {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      value: httpApi.url!,
    })
    new cdk.CfnOutput(this, 'bucketName', { value: filesBucket.bucketName })
  }
}
