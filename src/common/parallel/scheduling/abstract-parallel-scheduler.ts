import {IParallelProcessParams, ParallelWorkerFunctions} from "../parallel-worker-functions";
import {IParallelJob, IDefaultInitializedParallelOptions, IEmptyParallelEnvironment, IParallelOperation} from "../";
import {ITask} from "../../task/task";
import {ITaskDefinition} from "../../task/task-definition";
import {IParallelTaskDefinition} from "../parallel-task-definition";
import {FunctionCallSerializer} from "../../function/function-call-serializer";
import {FunctionCall} from "../../function/function-call";
import {IParallelJobScheduler} from "./parallel-job-scheduler";

export abstract class AbstractParallelScheduler implements IParallelJobScheduler {
    public schedule<TResult>(job: IParallelJob): ITask<TResult>[] {
        const taskDefinitions = this.getTaskDefinitions(job);
        return taskDefinitions.map(taskDefinition => job.options.threadPool.scheduleTask(taskDefinition));
    }

    /**
     * Returns the suggested scheduling for the given number of values - while concerning the passed in options.
     * @param totalNumberOfValues the total number of values to be processed by the parallel operation chain
     * @param options the parallel options provided for this operation chain
     */
    public abstract getScheduling(totalNumberOfValues: number, options: IDefaultInitializedParallelOptions): IParallelTaskScheduling;

    private getTaskDefinitions(job: IParallelJob): ITaskDefinition[] {
        const scheduling = this.getScheduling(job.generator.length, job.options);
        const functionCallSerializer = job.options.threadPool.createFunctionSerializer();

        const environment = this.serializeEnvironment(job.environment, functionCallSerializer);
        const operations = this.serializeOperations(job.operations, functionCallSerializer);

        const taskDefinitions: ITaskDefinition[] = [];
        for (let i = 0; i < scheduling.numberOfTasks; ++i) {
            const generator = job.generator.serializeSlice(i, scheduling.valuesPerTask, functionCallSerializer);

            const processParams: IParallelProcessParams = {
                environment,
                generator,
                operations,
                taskIndex: i,
                valuesPerTask: scheduling.valuesPerTask
            };

            const taskDefinition: IParallelTaskDefinition = {
                main: functionCallSerializer.serializeFunctionCall(ParallelWorkerFunctions.process, processParams),
                taskIndex: i,
                usedFunctionIds: functionCallSerializer.serializedFunctionIds,
                valuesPerTask: scheduling.valuesPerTask
            };

            taskDefinitions.push(taskDefinition);
        }
        return taskDefinitions;
    }

    private serializeOperations(operations: IParallelOperation[], functionCallSerializer: FunctionCallSerializer) {
        return operations.map(operation => ({
            iteratee: functionCallSerializer.serializeFunctionCall(operation.iteratee),
            iterator: functionCallSerializer.serializeFunctionCall(operation.iterator, ...operation.iteratorParams)
        }));
    }

    private serializeEnvironment(environment: FunctionCall | IEmptyParallelEnvironment | undefined, functionCallSerializer: FunctionCallSerializer) {
        if (environment) {
            if (environment instanceof FunctionCall) {
                return functionCallSerializer.serializeFunctionCall(environment.func, ...environment.params);
            }
            return environment;
        }

        return undefined;
    }
}

/**
 * Defines how a parallel task should be scheduled on the thread pool
 */
export interface IParallelTaskScheduling {

    /**
     * How many number of tasks should be created to perform the operation
     */
    numberOfTasks: number;

    /**
     * How many values to process by each task (at most)
     */
    valuesPerTask: number;
}