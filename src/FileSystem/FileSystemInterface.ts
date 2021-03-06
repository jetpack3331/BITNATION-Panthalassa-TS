import {IpfsAddedFileResponse} from '../ValueObjects';

export default interface FileSystemInterface {

    writeFile(fileName: string, content: string): Promise<IpfsAddedFileResponse>

}