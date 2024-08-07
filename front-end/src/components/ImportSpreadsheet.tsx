import { GrpcWebFetchTransport } from '@protobuf-ts/grpcweb-transport';
import { AccountServiceClient } from '../messaging/dto/account.client';
import './ImportSpreadsheet.css';
import { CreateAccountRequest } from '../messaging/dto/account';

const transport = new GrpcWebFetchTransport({
  baseUrl: 'http://localhost:8080',
});

const ImportSpreadsheet: React.FC = () => {

  const service = new AccountServiceClient(transport)

  const createAccount = async () => {
    let response = await service.createAccount(CreateAccountRequest.create({
      initialAmount: 0,
      name: "my-account",
    })).response

    console.log(response)
  }

  return (
    <div id="container">
      <p>Import spreadsheet</p>
      <button onClick={createAccount}>test</button>
    </div>
  );
};

export default ImportSpreadsheet;
