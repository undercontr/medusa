import {
  LocalWorkflow,
  WorkflowHandler,
  WorkflowManager,
} from "@medusajs/orchestration"
import { LoadedModule, MedusaContainer } from "@medusajs/types"
import { FlowRunOptions, WorkflowResult, exportWorkflow } from "../../helper"
import { CreateWorkflowComposerContext, StepReturn } from "./index"
import {
  SymbolInputReference,
  SymbolMedusaWorkflowComposerContext,
  SymbolWorkflowStep,
} from "./symbol"

global[SymbolMedusaWorkflowComposerContext] = null

type ReturnWorkflow<TData, TResult, THooks extends Record<string, Function>> = {
  <TDataOverride = undefined, TResultOverride = undefined>(
    container?: LoadedModule[] | MedusaContainer
  ): Omit<LocalWorkflow, "run"> & {
    run: (
      args?: FlowRunOptions<
        TDataOverride extends undefined ? TData : TDataOverride
      >
    ) => Promise<
      WorkflowResult<
        TResultOverride extends undefined ? TResult : TResultOverride
      >
    >
  }
} & THooks

/**
 * Creates a new workflow with the given name and composer function.
 * The composer function will compose the workflow by using the step, parallelize and other util functions that
 * will allow to define the flow of event of a workflow.
 *
 * @param name
 * @param composer
 *
 * @example
 * ```ts
 * import { createWorkflow, StepReturn } from "@medusajs/workflows"
 * import { createProductStep, getProductStep, createPricesStep } from "./steps"
 *
 * interface MyWorkflowData {
 *  title: string
 * }
 *
 * const myWorkflow = createWorkflow("my-workflow", (input: StepReturn<MyWorkflowData>) => {
 *    // Everything here will be executed and resolved later during the execution. Including the data access.
 *
 *    const product = createProductStep(input)
 *    const prices = createPricesStep(product)
 *
 *    const id = product.id
 *    return getProductStep(product.id)
 * })
 * ```
 */

export function createWorkflow<
  TData,
  TResult,
  THooks extends Record<string, Function>
>(
  name: string,
  composer: (input: StepReturn<TData>) => void | StepReturn<TResult>
): ReturnWorkflow<TData, TResult, THooks> {
  const handlers: WorkflowHandler = new Map()

  if (WorkflowManager.getWorkflow(name)) {
    WorkflowManager.unregister(name)
  }

  WorkflowManager.register(name, undefined, handlers)

  const context: CreateWorkflowComposerContext = {
    workflowId: name,
    flow: WorkflowManager.getTransactionDefinition(name),
    handlers,
    hooks_: [],
    hooksCallback_: {},
    hookBinder: (name, fn) => {
      context.hooks_.push(name)
      return fn(context)
    },
    stepBinder: (fn) => {
      return fn.bind(context)()
    },
    parallelizeBinder: (fn) => {
      return fn.bind(context)()
    },
  }

  global[SymbolMedusaWorkflowComposerContext] = context

  const valueHolder: StepReturn = {
    __value: {},
    __type: SymbolInputReference,
    __step__: "",
  }

  const returnedStep = composer.apply(context, [valueHolder])

  delete global[SymbolMedusaWorkflowComposerContext]

  WorkflowManager.update(name, context.flow, handlers)

  const workflow = exportWorkflow<TData, TResult>(name)

  const mainFlow = <TDataOverride = undefined, TResultOverride = undefined>(
    container?: LoadedModule[] | MedusaContainer
  ) => {
    const workflow_ = workflow<TDataOverride, TResultOverride>(container)
    const originalRun = workflow_.run

    workflow_.run = (async (
      args?: FlowRunOptions<
        TDataOverride extends undefined ? TData : TDataOverride
      >
    ): Promise<
      WorkflowResult<
        TResultOverride extends undefined ? TResult : TResultOverride
      >
    > => {
      args ??= {}
      args.resultFrom ??=
        returnedStep?.__type === SymbolWorkflowStep
          ? returnedStep.__step__
          : undefined

      // Forwards the input to the ref object on composer.apply
      valueHolder.__value = args?.input as any
      return (await originalRun(args)) as unknown as WorkflowResult<
        TResultOverride extends undefined ? TResult : TResultOverride
      >
    }) as any
    return workflow_
  }

  for (const hook of context.hooks_) {
    mainFlow[hook] = (fn) => {
      context.hooksCallback_[hook] ??= []

      context.hooksCallback_[hook].push(fn)
    }
  }

  return mainFlow as ReturnWorkflow<TData, TResult, THooks>
}
