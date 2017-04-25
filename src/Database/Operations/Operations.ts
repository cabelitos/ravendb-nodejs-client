import {RequestsExecutor} from "../../Http/Request/RequestsExecutor";
import * as Promise from "bluebird";
import {PromiseResolve, PromiseReject} from "../../Utility/PromiseResolver";
import {DateUtil} from "../../Utility/DateUtil";
import {GetOperationStateCommand} from "../Commands/GetOperationStateCommand";
import {RavenCommandResponse} from "../RavenCommandResponse";
import {TimeoutException, InvalidOperationException} from "../DatabaseExceptions";

export class Operations {
  protected requestsExecutor: RequestsExecutor;

  constructor(requestsExecutor: RequestsExecutor) {
    this.requestsExecutor = requestsExecutor;
  }

  public waitForOperationComplete(operationId: string, timeout?: number): Promise<RavenCommandResponse> {
    return new Promise<null>((resolve: PromiseResolve<RavenCommandResponse>, reject: PromiseReject) => {
      const startTime: number = DateUtil.timestamp();
      const getOperationCommand: GetOperationStateCommand = new GetOperationStateCommand(operationId);

      const execute: () => void = () => {
        this.requestsExecutor.execute(getOperationCommand)
          .catch((error: Error) => reject(error))
          .then((response: RavenCommandResponse) => {
            if (timeout && ((DateUtil.timestamp() - startTime) > timeout)) {
              reject(new TimeoutException('The operation did not finish before the timeout end'));
            } else if (response.Status == 'Completed') {
              resolve(response);
            } else if (response.Status == 'Faulted') {
              reject(new InvalidOperationException(response.Result.Error));
            } else {
              setTimeout(() => execute(), 500);
            }
          })
      };

      execute();
    });
  }
}