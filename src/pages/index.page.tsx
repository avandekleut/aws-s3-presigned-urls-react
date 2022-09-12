import { FormEvent, useState } from 'react'
import { S3_BUCKET_URL } from 'src/constants'
import CircularProgress from '@mui/material/CircularProgress'
import { uploadToS3 } from './upload-file'
import { useFileChange } from './use-file-change'

const Home: React.FC = () => {
  const [downloadVisible, setDownloadVisible] = useState(false)
  const [generateVisible, setGenerateVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  const fileChangeCallback = () => {
    console.log('setting upload visibile')
    setGenerateVisible(true)
  }

  const {
    fileError,
    fileName,
    fileContents,
    fileType,
    fileDispatch,
    handleFileChange,
  } = useFileChange(fileChangeCallback)
  const [s3FileUrl, setS3FileUrl] = useState('')

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setDownloadVisible(false)
    setLoading(true)

    try {
      if (fileType && fileContents) {
        const filePath = await uploadToS3({ fileType, fileContents })
        setS3FileUrl(`${S3_BUCKET_URL}/${filePath}`)
        console.log('filePath is', filePath)
        fileDispatch({ type: 'RESET_FILE_STATE' })
        setDownloadVisible(true)
        setGenerateVisible(false)
      }
      setLoading(false)
    } catch (err) {
      console.log('error is', err)
    }
  }
  return (
    <>
      <div className="w-full">
        <div className="flex flex-col items-center justify-center mt-40">
          <h1 className="max-w-xl text-3xl">Upload .xlsx:</h1>
          {fileError && (
            <h1 className="max-w-3xl text-3xl text-red-600">{fileError}</h1>
          )}

          <div>
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col items-center mt-2">
                <label
                  htmlFor="picture"
                  className="px-5 py-1 mt-6 bg-white border rounded-lg shadow cursor-pointer hover:bg-green-600 hover:text-white"
                >
                  <span className="mt-2 text-base leading-normal">
                    {fileName || 'File Input'}
                  </span>
                  <input
                    type="file"
                    accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    id="picture"
                    name="picture"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
                <div>
                  {generateVisible && (
                    <button
                      type="submit"
                      className="px-1 py-2 my-6 border-2 border-green-400 rounded-md hover:bg-green-400"
                    >
                      {loading ? (
                        <CircularProgress />
                      ) : (
                        <p>Generate Matchings</p>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </form>
            {/* <span className="inline-block w-96 h-96"> */}
            <span>
              {downloadVisible && (
                <button
                  type="submit"
                  className="px-1 py-2 my-6 border-2 border-green-400 rounded-md hover:bg-green-200"
                >
                  <a href={s3FileUrl || ''}>Download Matchings</a>
                </button>
              )}
            </span>
          </div>
        </div>
      </div>
    </>
  )
}

export default Home
