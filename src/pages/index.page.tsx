import { FormEvent, useEffect, useState } from 'react'
import React from 'react'
import CircularProgress from '@mui/material/CircularProgress'
import { uploadToS3 } from './upload-file'
import { useFileChange } from './use-file-change'
import axios from 'axios'

import { backOff } from 'exponential-backoff'

const Home: React.FC = () => {
  const [state, setState] = useState({
    downloadVisible: false,
    generateVisible: false,
    loading: false,
  })

  const fileChangeCallback = () => {
    console.log('setting upload visibile')
    setState({ loading: false, downloadVisible: false, generateVisible: true })
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

  useEffect(() => {
    if (s3FileUrl) {
      const tryDownload = async () => {
        const response = await axios.get(s3FileUrl, {
          validateStatus: () => true,
        })
        if (response.status === 200) {
          console.log('Available!')
          setState({
            ...state,
            loading: false,
            downloadVisible: true,
          })
        } else {
          throw new Error('Not yet available.')
        }
      }

      ;(async () => {
        const response = backOff(tryDownload, {
          startingDelay: 1000,
          timeMultiple: 1.5,
          numOfAttempts: 20,
          maxDelay: 3000,
        })
      })()
    }
  }, [s3FileUrl])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    console.log('handleSubmit')

    try {
      if (fileType && fileContents) {
        setState({
          ...state,
          loading: true,
        })
        const {
          presignedGet,
          presignedPost,
          uploadFilePath,
          downloadFilePath,
        } = await uploadToS3({
          fileType,
          fileContents,
        })

        console.log({
          presignedGet,
          presignedPost,
          uploadFilePath,
          downloadFilePath,
        })

        setS3FileUrl(presignedGet)
        // fileDispatch({ type: 'RESET_FILE_STATE' })
        setState({
          ...state,
          loading: true,
          downloadVisible: false,
          // generateVisible: false,
        })
      } else {
        console.log('Did not run callback')
        console.log({ fileType, fileContents })
      }
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
                  {state.generateVisible && (
                    <button
                      type="submit"
                      className="px-1 py-2 my-6 border-2 border-green-400 rounded-md hover:bg-green-400"
                    >
                      <p>Generate Matchings</p>
                    </button>
                  )}
                </div>
                <div>{state.loading && <CircularProgress />}</div>
              </div>
            </form>
            <div className="flex flex-col items-center mt-2">
              {state.downloadVisible && (
                <button
                  type="submit"
                  className="px-1 py-2 my-6 border-2 border-green-400 rounded-md background-color:bg-green-200"
                >
                  <a href={s3FileUrl || ''}>Download Matchings</a>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Home
