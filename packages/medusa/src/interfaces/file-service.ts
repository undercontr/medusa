import { TransactionBaseService } from "./transaction-base-service"
import {
  DeleteFileType,
  FileServiceGetUploadStreamResult,
  FileServiceUploadResult,
  GetUploadedFileType,
  UploadStreamDescriptorType,
} from "@medusajs/types"

export interface IFileService extends TransactionBaseService {
  /**
   * upload file to fileservice
   * @param file Multer file from express multipart/form-data
   * */
  upload(file: Express.Multer.File): Promise<FileServiceUploadResult>

  /**
   * upload private file to fileservice
   * @param file Multer file from express multipart/form-data
   * */
  uploadProtected(file: Express.Multer.File): Promise<FileServiceUploadResult>

  /**
   * remove file from fileservice
   * @param fileData Remove file described by record
   * */
  delete(fileData: DeleteFileType): Promise<void>

  /**
   * upload file to fileservice from stream
   * @param fileData file metadata relevant for fileservice to create and upload the file
   * @param fileStream readable stream of the file to upload
   * */
  getUploadStreamDescriptor(
    fileData: UploadStreamDescriptorType
  ): Promise<FileServiceGetUploadStreamResult>

  /**
   * download file from fileservice as stream
   * @param fileData file metadata relevant for fileservice to download the file
   * @returns readable stream of the file to download
   * */
  getDownloadStream(
    fileData: GetUploadedFileType
  ): Promise<NodeJS.ReadableStream>

  /**
   * Generate a presigned download url to obtain a file
   * @param fileData file metadata relevant for fileservice to download the file
   * @returns presigned url to download the file
   * */
  getPresignedDownloadUrl(fileData: GetUploadedFileType): Promise<string>
}
export abstract class AbstractFileService
  extends TransactionBaseService
  implements IFileService
{
  static _isFileService = true

  static isFileService(object): object is AbstractFileService {
    return object?.constructor?._isFileService
  }

  abstract upload(
    fileData: Express.Multer.File
  ): Promise<FileServiceUploadResult>

  abstract uploadProtected(
    fileData: Express.Multer.File
  ): Promise<FileServiceUploadResult>

  abstract delete(fileData: DeleteFileType): Promise<void>

  abstract getUploadStreamDescriptor(
    fileData: UploadStreamDescriptorType
  ): Promise<FileServiceGetUploadStreamResult>

  abstract getDownloadStream(
    fileData: GetUploadedFileType
  ): Promise<NodeJS.ReadableStream>

  abstract getPresignedDownloadUrl(
    fileData: GetUploadedFileType
  ): Promise<string>
}
