import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda'
import { S3 } from 'aws-sdk'
import { v4 as uuidv4 } from 'uuid'

if (!process.env.BUCKET_NAME)
  throw new Error('Environment variable Bucket name is required.')

type Event = APIGatewayProxyEventV2 & {
  queryStringParameters: { fileType: string }
}

const s3 = new S3()

type GetPresignedPostUrlResponse = {
  presignedPost: S3.PresignedPost
  presignedGet: string
  uploadFilePath: string
  downloadFilePath: string
}

export async function main(event: Event): Promise<APIGatewayProxyResultV2> {
  console.log('Event is', JSON.stringify(event, null, 2))
  try {
    if (!event.queryStringParameters?.fileType)
      throw new Error(
        'Querystring parameter fileType must be provided when creating a presigned URL, i.e. ?fileType=image/png'
      )

    const { fileType } = event.queryStringParameters

    const uuid = uuidv4()

    console.log({ uuid })

    const uploadFilePath = `${uuid}/preferences.xlsx`
    const presignedPost = await createPresignedPost({
      fileType,
      filePath: uploadFilePath,
    })

    const downloadFilePath = `${uuid}/matching.json`
    const presignedGet = createPresignedGet({
      filePath: uploadFilePath,
    })

    const response: GetPresignedPostUrlResponse = {
      presignedPost,
      presignedGet,
      uploadFilePath,
      downloadFilePath,
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response),
    }
  } catch (error: unknown) {
    console.log('ERROR is:', error)
    if (error instanceof Error) {
      return { statusCode: 400, body: JSON.stringify({ error: error.message }) }
    }
    return {
      statusCode: 400,
      body: JSON.stringify({ error: JSON.stringify(error) }),
    }
  }
}

type GetPresignedPostUrlParams = {
  fileType: string
  filePath: string
}

type GetPresignedGetUrlParams = {
  filePath: string
}

export function createPresignedPost({
  fileType,
  filePath,
}: GetPresignedPostUrlParams): Promise<S3.PresignedPost> {
  const params: S3.PresignedPost.Params = {
    Bucket: process.env.BUCKET_NAME,
    Fields: { key: filePath, acl: 'public-read' },
    // Fields: { key: filePath },
    Conditions: [
      // content length restrictions: 0-1MB]
      ['content-length-range', 0, 1000000],
      // specify content-type to be more generic- images only
      // ['starts-with', '$Content-Type', 'image/'],
      ['eq', '$Content-Type', fileType],
    ],
    // number of seconds for which the presigned policy should be valid
    Expires: 15,
  }

  return s3.createPresignedPost(params) as unknown as Promise<S3.PresignedPost>
}

export function createPresignedGet({
  filePath,
}: GetPresignedGetUrlParams): string {
  return s3.getSignedUrl('getObject', {
    Bucket: process.env.BUCKET_NAME,
    Key: filePath,
    Expires: 60 * 60,
  })
}
