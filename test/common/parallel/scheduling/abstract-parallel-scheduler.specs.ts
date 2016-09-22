import {IDefaultInitializedParallelOptions} from "../../../../src/common/parallel/parallel-options";
import {IThreadPool} from "../../../../src/common/thread-pool/thread-pool";
import {FunctionCallSerializer} from "../../../../src/common/function/function-call-serializer";
import {ISerializedFunctionCall} from "../../../../src/common/function/serialized-function-call";
import {
    AbstractParallelScheduler,
    IParallelTaskScheduling
} from "../../../../src/common/parallel/scheduling/abstract-parallel-scheduler";
import {FunctionCall} from "../../../../src/common/function/function-call";
import {IParallelGenerator} from "../../../../src/common/parallel/generator/parallel-generator";
import {ParallelCollectionGenerator} from "../../../../src/common/parallel/generator/parallel-collection-generator";
import {ParallelWorkerFunctionIds} from "../../../../src/common/parallel/slave/parallel-worker-functions";
import {functionId} from "../../../../src/common/function/function-id";

describe("AbstractParallelScheduler", function () {
    let options: IDefaultInitializedParallelOptions;
    let generator: IParallelGenerator;
    let createFunctionSerializerSpy: jasmine.Spy;
    let scheduleTaskSpy: jasmine.Spy;
    let threadPool: IThreadPool;
    let scheduler: AbstractParallelScheduler;
    let getSchedulingSpy: jasmine.Spy;

    beforeEach(function () {
        scheduler = new SimpleScheduler();
        getSchedulingSpy = spyOn(scheduler, "getScheduling");

        createFunctionSerializerSpy = jasmine.createSpy("createFunctionSerializer");
        scheduleTaskSpy = jasmine.createSpy("scheduleTask");
        threadPool = {
            getFunctionSerializer: createFunctionSerializerSpy,
            schedule: jasmine.createSpy("schedule"),
            scheduleTask: scheduleTaskSpy
        };

        options = {
            maxConcurrencyLevel: 2,
            scheduler,
            threadPool
        };

        generator = new ParallelCollectionGenerator([1, 2, 3, 4, 5]);
    });

    describe("schedule", function () {
        it("schedules the tasks on the thread pool", function () {
            // arrange
            getSchedulingSpy.and.returnValue({ numberOfTasks: 2, valuesPerTask: 3 });
            const functionSerializer = new FunctionCallSerializer(undefined as any);
            createFunctionSerializerSpy.and.returnValue(functionSerializer);

            spyOn(functionSerializer, "serializeFunctionCall");

            const task1 = new Promise(() => undefined);
            const task2 = new Promise(() => undefined);

            scheduleTaskSpy.and.returnValues(task1, task2);

            spyOn(generator, "serializeSlice").and.returnValue({ functionId: 2 });

            // act
            const tasks = scheduler.schedule({
                generator,
                options,
                operations: []
            });

            // assert
            expect(scheduleTaskSpy).toHaveBeenCalledTimes(2);
            expect(tasks).toEqual([task1, task2]);
        });

        it("calls the generator.serializeSlice for each task to spawn", function () {
            // arrange
            getSchedulingSpy.and.returnValue({ numberOfTasks: 2, valuesPerTask: 3 });
            const functionSerializer = new FunctionCallSerializer(undefined as any);
            createFunctionSerializerSpy.and.returnValue(functionSerializer);

            spyOn(functionSerializer, "serializeFunctionCall");

            const task1 = new Promise(() => undefined);
            const task2 = new Promise(() => undefined);

            scheduleTaskSpy.and.returnValues(task1, task2);

            const serializeSliceSpy = spyOn(generator, "serializeSlice").and.returnValue({ functionId: 2 });

            // act
            scheduler.schedule({
                generator,
                options,
                operations: []
            });

            // assert
            expect(serializeSliceSpy).toHaveBeenCalledWith(0, 3, functionSerializer);
            expect(serializeSliceSpy).toHaveBeenCalledWith(1, 3, functionSerializer);
        });

        it("passes the serialized environment to the main function", function () {
            // arrange
            getSchedulingSpy.and.returnValue({ numberOfTasks: 1, valuesPerTask: 3 });
            const serializeFunctionCallSpy = jasmine.createSpy("serializeFunction");
            const functionSerializer = {
                serializeFunctionCall: serializeFunctionCallSpy,
                serializedFunctionIds: [1, 9]
            };

            createFunctionSerializerSpy.and.returnValue(functionSerializer);
            spyOn(generator, "serializeSlice").and.returnValue({ functionId: 2 });

            // act
            scheduler.schedule({
                environment: { test: 10 },
                generator,
                options,
                operations: []
            });

            // assert
            expect(serializeFunctionCallSpy).toHaveBeenCalledWith(FunctionCall.create(ParallelWorkerFunctionIds.PARALLEL_JOB_EXECUTOR, {
                environment: { test: 10 },
                generator: { functionId: 2 },
                operations: [],
                taskIndex: 0,
                valuesPerTask: 3
            }));
        });

        it("serializes the environment provider as serialized function call", function () {
            // arrange
            getSchedulingSpy.and.returnValue({ numberOfTasks: 1, valuesPerTask: 3 });
            const serializeFunctionCallSpy = jasmine.createSpy("serializeFunction");
            const functionSerializer = {
                serializeFunctionCall: serializeFunctionCallSpy,
                serializedFunctionIds: [1, 5, 9]
            };

            const initializer = (val: number) => ({ test: val });

            spyOn(generator, "serializeSlice").and.returnValue({ functionId: 2 });

            createFunctionSerializerSpy.and.returnValue(functionSerializer);
            serializeFunctionCallSpy.and.callFake((call: FunctionCall) => {
                if (call.func === initializer) {
                    return { ______serializedFunctionCall: true, functionId: 5, parameters: call.params };
                }
                return undefined;
            });

            // act
            scheduler.schedule({
                environment: FunctionCall.create(initializer, 10),
                generator,
                options,
                operations: []
            });

            // assert
            expect(serializeFunctionCallSpy).toHaveBeenCalledWith(FunctionCall.create(ParallelWorkerFunctionIds.PARALLEL_JOB_EXECUTOR, {
                environment: { ______serializedFunctionCall: true, functionId: 5, parameters: [ 10 ] },
                generator: { functionId: 2 },
                operations: [],
                taskIndex: 0,
                valuesPerTask: 3
            }));
        });

        it("schedules a task for each slice according to the job", function () {
            // arrange
            getSchedulingSpy.and.returnValue({ numberOfTasks: 2, valuesPerTask: 3 });
            const serializeFunctionCallSpy = jasmine.createSpy("serializeFunction");
            const functionSerializer = {
                serializeFunctionCall: serializeFunctionCallSpy,
                serializedFunctionIds: [ParallelWorkerFunctionIds.TO_ITERATOR, ParallelWorkerFunctionIds.PARALLEL_JOB_EXECUTOR, ParallelWorkerFunctionIds.MAP, ParallelWorkerFunctionIds.FILTER, functionId("test", 0)]
            };

            const powerOf = (value: number) => value ** 2;
            createFunctionSerializerSpy.and.returnValue(functionSerializer);

            serializeFunctionCallSpy.and.callFake((call: FunctionCall): ISerializedFunctionCall => {
                if (call.func === ParallelWorkerFunctionIds.PARALLEL_JOB_EXECUTOR) {
                    return { ______serializedFunctionCall: true, functionId: ParallelWorkerFunctionIds.PARALLEL_JOB_EXECUTOR, parameters: call.params };
                }
                if (call.func === ParallelWorkerFunctionIds.MAP) {
                    return { ______serializedFunctionCall: true, functionId: ParallelWorkerFunctionIds.MAP, parameters: call.params };
                }
                if (call.func === powerOf) {
                    return { ______serializedFunctionCall: true, functionId: functionId("test", 0), parameters: call.params };
                }
                throw new Error("Unknown function call" + JSON.stringify(call));
            });

            const task1 = new Promise(() => undefined);
            const task2 = new Promise(() => undefined);

            scheduleTaskSpy.and.returnValues(task1, task2);

            const generatorSlice1 = { ______serializedFunctionCall: true, functionId: ParallelWorkerFunctionIds.TO_ITERATOR, parameters: [[1, 2, 3]] };
            const generatorSlice2 = { ______serializedFunctionCall: true, functionId: ParallelWorkerFunctionIds.TO_ITERATOR, parameters: [[4, 5]] };
            spyOn(generator, "serializeSlice").and.returnValues(generatorSlice1, generatorSlice2);

            // act
            scheduler.schedule({
                generator,
                operations: [
                    {
                        iteratee: FunctionCall.createUnchecked(powerOf),
                        iterator: FunctionCall.create(ParallelWorkerFunctionIds.MAP)
                    }
                ],
                options
            });

            // assert
            // slice 1
            expect(scheduleTaskSpy).toHaveBeenCalledWith({
                main: {
                    ______serializedFunctionCall: true,
                    functionId: ParallelWorkerFunctionIds.PARALLEL_JOB_EXECUTOR, // process
                    parameters: [
                        {
                            environment: undefined,
                            generator: generatorSlice1,
                            operations: [
                                {
                                    iteratee: { ______serializedFunctionCall: true, functionId: functionId("test", 0), parameters: [] }, // powerOf
                                    iterator: { ______serializedFunctionCall: true, functionId: ParallelWorkerFunctionIds.MAP, parameters: [] } // map
                                }
                            ],
                            taskIndex: 0,
                            valuesPerTask: 3
                        }
                    ]
                },
                taskIndex: 0,
                usedFunctionIds: jasmine.arrayContaining([ParallelWorkerFunctionIds.PARALLEL_JOB_EXECUTOR, ParallelWorkerFunctionIds.MAP, functionId("test", 0), ParallelWorkerFunctionIds.TO_ITERATOR]),
                valuesPerTask: 3
            });

            // slice 2
            expect(scheduleTaskSpy).toHaveBeenCalledWith({
                main: {
                    ______serializedFunctionCall: true,
                    functionId: ParallelWorkerFunctionIds.PARALLEL_JOB_EXECUTOR, // process
                    parameters: [
                        {
                            environment: undefined,
                            generator: generatorSlice2,
                            operations: [
                                {
                                    iteratee: { ______serializedFunctionCall: true, functionId: functionId("test", 0), parameters: [] }, // powerOf
                                    iterator: { ______serializedFunctionCall: true, functionId: ParallelWorkerFunctionIds.MAP, parameters: [] } // map
                                }
                            ],
                            taskIndex: 1,
                            valuesPerTask: 3
                        }
                    ]
                },
                taskIndex: 1,
                usedFunctionIds: jasmine.arrayContaining([ParallelWorkerFunctionIds.TO_ITERATOR, ParallelWorkerFunctionIds.PARALLEL_JOB_EXECUTOR, ParallelWorkerFunctionIds.MAP, functionId("test", 0)]),
                valuesPerTask: 3
            });
        });
    });

    class SimpleScheduler extends AbstractParallelScheduler {
        public getScheduling(totalNumberOfValues: number, opts: IDefaultInitializedParallelOptions): IParallelTaskScheduling {
            return undefined as any;
        }
    }
});
