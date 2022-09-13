import axios from 'axios'
import { API_BASE_URL } from 'src/constants'

export async function uploadToS3({
  fileType,
  fileContents,
}: {
  fileType: string
  fileContents: File
}) {
  const { presignedGet, presignedPost, uploadFilePath, downloadFilePath } =
    await getPresignedPostUrl(fileType)

  console.log({ presignedGet, presignedPost, uploadFilePath, downloadFilePath })

  const formData = new FormData()
  formData.append('Content-Type', fileType)

  console.log('Seting formdata fields', presignedPost.fields)

  Object.entries(presignedPost.fields).forEach(([k, v]) => {
    formData.append(k, v)
  })

  console.log('setting file')

  formData.append('file', fileContents) // The file has be the last element

  console.log('sending post')

  const response = await axios.post<unknown>(presignedPost.url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  return { presignedGet, presignedPost, uploadFilePath, downloadFilePath }
}

type PresignedPostUrlResponse = {
  presignedPost: {
    url: string
    fields: {
      key: string
      acl: string
      bucket: string
    }
  }
  presignedGet: string
  uploadFilePath: string
  downloadFilePath: string
}

const GET_PRESIGNED_URL_API_PATH = 'get-presigned-url-s3'

async function getPresignedPostUrl(fileType: string) {
  const { data } = await axios.get<PresignedPostUrlResponse>(
    `${API_BASE_URL}/${GET_PRESIGNED_URL_API_PATH}?fileType=${fileType}`
  )

  return data
}
