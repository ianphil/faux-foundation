The explore agent confirms my analysis — the spec is complete and accurate. Here is the product specification:

---

# Product Spec — foundry-agents

> Inferred from source review of jplane/foundry-agents. This spec describes observable, product-level behavior rather than implementation details.

---

## 1. Problem Statement

Developers who want to build AI-powered agents on Azure face a steep learning curve: the Azure AI Agent Service offers several distinct tool integration patterns, but each requires non-trivial wiring and configuration before producing a working result. Without concrete, runnable examples, developers must piece together documentation and SDK references to understand how agents, threads, tools, and multi-agent pipelines actually behave together.

This repository addresses that problem by providing a curated set of minimal, opinionated examples that demonstrate each major tool integration pattern in isolation, then show how those patterns compose into a working multi-agent pipeline. Each example is self-contained and immediately runnable inside a pre-configured development environment.

---

## 2. Actors and Their Goals

### Developer (primary)
- Wants to understand what Azure AI Agent Service can do without reading lengthy documentation
- Wants runnable examples they can modify and extend for their own use cases
- Wants to see each tool integration pattern in isolation before combining them

### Operator (same person as Developer in this context)
- Configures the Azure environment (Foundry hub, project, model deployment, RBAC)
- Provides a valid connection string and Azure credentials
- Optionally deploys a public REST API endpoint for the OpenAPI example

### Azure AI Agent Service (external system)
- Hosts and executes agents
- Manages threads and message history
- Invokes tool calls as directed by the model and returns results to the agent

---

## 3. Operator Value

| Value | Description |
|---|---|
| Accelerated onboarding | A developer can go from zero to a working agent in a single Dev Container session |
| Pattern coverage | Every major tool integration available in Azure AI Agent Service is demonstrated at least once |
| Compositional clarity | The multi-agent example explicitly shows how shared threads allow specialist agents to cooperate without a complex orchestrator |
| Low-friction setup | A single Dev Container configuration installs all dependencies, CLI tools, and editor extensions automatically |
| Reusable fixtures | Three pre-written city information files and a deployable weather API serve as reusable data and service stubs across examples |

---

## 4. Core Capabilities

### 4.1 Local Function Tool Integration
The system demonstrates how an agent can be equipped with a locally defined function as a callable tool. When a user message requires data the model cannot answer from training alone, the agent autonomously decides to invoke the function, collects its output, and incorporates that output into its response.

### 4.2 Vectorized File Search
The system demonstrates how an agent can retrieve relevant passages from a set of uploaded documents using semantic similarity search. The agent synthesizes a natural-language answer from the retrieved content and includes source annotations tracing back to the original files.

### 4.3 REST API Invocation via OpenAPI Specification
The system demonstrates how an agent can call an external REST API using an OpenAPI specification as its interface contract. The agent selects and calls the appropriate API operation based on user intent, then incorporates the API response into its answer. Authentication is configurable per-tool at agent creation time.

### 4.4 Simultaneous Multi-Tool Agents
The system demonstrates how a single agent can be equipped with multiple heterogeneous tools (e.g., file search and REST API invocation together), selecting among them autonomously based on what a given user message requires.

### 4.5 Multi-Agent Pipeline on a Shared Thread
The system demonstrates how multiple specialized agents can participate sequentially in the same conversation thread. Each agent reads the full thread history, contributes its specific information as a new message, and the next agent builds on what the previous agents wrote. The pipeline is deterministic: the calling code explicitly controls which agent runs and in what order.

### 4.6 Structured Output from Agents
The system demonstrates how agents can be configured to return machine-readable JSON responses, including explicit schema guidance in the agent's instructions, suitable for downstream programmatic consumption.

### 4.7 Deployable API Stub
The system includes a minimal deployable REST API with an OpenAPI specification, serving as a concrete, publicly reachable endpoint that the OpenAPI tool integration example can call against.

---

## 5. Observable Behaviors

### Agent with local function call
- **Trigger**: Developer posts a natural-language question (e.g., "Do I need an umbrella in New York today?") to an agent thread
- **Response**: The agent invokes the registered local function with the appropriate argument, receives the function's output, and returns a natural-language answer incorporating that output
- **Persistent effect**: The thread retains both the user message and the agent's response; the agent and thread remain registered in the service
- **Failure behavior**: If the run fails, the run's status is `"failed"` and a `last_error` field is populated with an error description; no assistant message is added to the thread

### Agent with file search
- **Trigger**: Developer posts a question whose answer exists in one of the uploaded documents (e.g., "Suggest an interesting thing to do in London today.")
- **Response**: The agent retrieves the most relevant passage from the vector store, synthesizes a response, and includes citations back to the source text
- **Persistent effect**: Uploaded files and vector store remain in the service after the run completes
- **Failure behavior**: Run status is `"failed"` with `last_error` populated if the run cannot complete

### Agent with OpenAPI invocation
- **Trigger**: Developer posts a question requiring external data (e.g., "Do I need an umbrella in New York today?") to an agent configured with an OpenAPI tool pointing to a deployed endpoint
- **Response**: The agent issues an HTTP request to the configured endpoint using the correct path and parameters, receives the response, and incorporates it into a natural-language answer
- **Prerequisite**: The API server URL must be configured in the OpenAPI specification before the agent is created; the API must be publicly reachable
- **Failure behavior**: If the endpoint is unreachable or returns an error, the run fails with a corresponding `last_error`

### Multi-tool agent
- **Trigger**: Developer posts a question requiring both file-sourced information and live API data (e.g., "Suggest a good tourist activity in London, and let me know if I'll need a jacket.")
- **Response**: The agent autonomously selects the appropriate tool(s) for each part of the question and synthesizes a single combined answer
- **Persistent effect**: Thread retains full conversation history

### Multi-agent pipeline
- **Trigger**: Developer initializes a thread, posts a user query, then explicitly runs each specialist agent in sequence on the same thread
- **Step-by-step effect**:
  1. User-info agent appends a JSON record of the named user (including their preferred city) to the thread
  2. City-info agent reads the thread context, appends tourist information for the preferred city
  3. Weather-info agent reads the thread context, appends weather data for the preferred city
  4. Summary agent reads all prior messages and produces a final structured JSON response answering the original query
- **Output**: A JSON object with fields for user ID, name, preferred city, suggested activity, and whether a jacket is needed
- **Failure behavior**: Each run's status is checked individually; a failed run is reported with its `last_error` but does not automatically halt subsequent runs — the calling code controls this

### Deployable weather API
- **Trigger**: HTTP GET request to `/weather/{location}`
- **Response**: JSON object with a `weather` field containing a short weather summary for the location
- **Unknown location**: Returns `{ "weather": "Weather data not available for this location." }` with HTTP 200
- **Response validation**: Responses are validated against the OpenAPI spec before being returned

---

## 6. Edge Cases and Failure Behavior

- **Unknown location in weather tool**: Both the local-function and API versions return a safe default string rather than an error when the location is not recognized
- **Run failure surfacing**: All examples check run status and print `last_error` if the run fails; no retry logic is implemented
- **Missing API endpoint**: The OpenAPI and multi-tool examples include an explicit in-notebook note warning that the weather API must be deployed and its URL configured before those cells execute; no validation prevents execution with an unconfigured URL
- **Missing `.env` file**: The notebooks load environment variables via dotenv; if `.env` does not exist (only `.env.example` is committed), the connection string will be empty and client initialization will fail at the first API call
- **RBAC misconfiguration**: If the operator's Azure identity lacks the required roles, agent creation or file upload will fail with an authorization error from the service
- **Model not deployed**: If the specified model (default: `gpt-4o`) is not deployed in the Foundry hub, agent creation will fail
- **Multi-agent context propagation**: The pipeline assumes each agent correctly reads and acts on prior thread messages; if an upstream agent fails silently, downstream agents will work from incomplete context without any automatic error propagation

---

## 7. Non-Functional Constraints

- **Azure dependency**: All agent capabilities require a live Azure subscription with a provisioned AI Foundry hub and project in a region that supports Azure AI Agent Service; no offline or local-only mode is available
- **Identity and access**: The operator must be authenticated via the Azure CLI; both `Storage Blob Data Contributor` and `Azure AI Developer` RBAC roles are required at the resource group level
- **Model requirement**: A supported large language model must be pre-deployed in the Foundry hub before any agent can be created
- **Public endpoint requirement**: The OpenAPI-based examples require the weather API to be deployed to a publicly accessible HTTP endpoint before use
- **Response validation**: The weather API enforces response contract validation against its OpenAPI spec; responses that violate the schema are rejected
- **No concurrency guarantees**: The multi-agent pipeline runs agents sequentially and provides no safeguards against concurrent thread modification
- **No persistent local state**: Agent IDs, thread IDs, and file IDs are not persisted between notebook runs; each execution creates new service-side resources

---

## 8. Non-Goals

- **Production-ready system**: This is an educational reference, not a deployable product. No authentication, authorization, observability, or operational hardening is included.
- **Dynamic orchestration**: The multi-agent example explicitly notes it uses deterministic, caller-controlled sequencing. An orchestrator agent that dynamically decides which specialist to invoke is out of scope.
- **Real data integrations**: All data sources (weather conditions, user records) are mocked. Integration with real-world APIs or databases is not demonstrated.
- **Test coverage**: No automated tests are included. The notebooks serve as manual, interactive verification.
- **CI/CD pipeline**: No continuous integration or deployment configuration is present.
- **Multi-model support**: The examples are written for `gpt-4o` only; supporting other model families is not addressed.
- **Cost management**: No guidance is provided on Azure billing, quota management, or resource cleanup after notebook execution.
- **Authentication for the weather API**: The deployed API uses anonymous (no-auth) access; securing the endpoint is explicitly out of scope.
- **Streaming responses**: All agent runs use blocking execution calls; streaming is not demonstrated.

---

## 9. Suspected Implementation Leakage

The following observations describe implementation details rather than product-level behavior. They belong in an interface or technical spec, not a product spec:

- **SDK types exposed in examples**: `AIProjectClient`, `FunctionTool`, `ToolSet`, `FileSearchTool`, `OpenApiTool`, `OpenApiAnonymousAuthDetails`, `FilePurpose`, `DefaultAzureCredential` — these are SDK surface area, not product capabilities
- **`connexion` framework**: The weather API is built with Flask and Connexion; this is a technology choice, not a product constraint
- **`jsonref`**: Used to resolve JSON `$ref` pointers in the OpenAPI spec; implementation detail of how the spec is loaded
- **Blocking run execution pattern**: The synchronous `create_and_process_run` call is an SDK convenience method; the product-level behavior is "the agent processes the thread and appends a response"
- **Vector store creation with polling**: Polling for async completion is an SDK pattern; the product promise is "uploaded files become searchable"
- **`temperature=0.1, top_p=0.1` settings on structured-output agents**: These are model inference parameters, not observable product behavior
- **`response_format={ "type": "json_object" }`**: This is an API-level request parameter; the product-level behavior is "the agent returns a valid JSON object"
- **Dev Container base image**: Infrastructure detail irrelevant to product capabilities
- **Azure Functions Core Tools installation**: Installed in the Dev Container setup script but not used by any demonstrated example; likely leftover or intended for future content