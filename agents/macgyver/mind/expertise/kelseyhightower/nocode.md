---

# Product Specification: No Code

*Inferred from observed artifacts in kelseyhightower/nocode via source review. No claims made by original authors are reproduced here as requirements.*

---

## 1. Problem Statement

Software carries inherent risk. Every line of code introduced into a system is a potential source of bugs, security vulnerabilities, operational failures, and maintenance burden. Conventional software development accepts this cost as unavoidable. This product challenges that assumption by proposing that the optimal application is one that has never been written — eliminating defects, attack surface, deployment complexity, and scaling concerns at their root.

The problem nocode addresses: **the software industry's default answer to any problem is to write more code, when the correct answer is often to write none.**

---

## 2. Actors and Their Goals

| Actor | Goal |
|---|---|
| **Developer** | Ship a reliable, secure application without introducing code-related risk |
| **Operator** | Deploy and scale a system with zero operational overhead |
| **Code Reviewer** | Evaluate changes without needing to assess correctness of logic |
| **Security Auditor** | Certify a codebase with no exploitable surface area |
| **Contributor** | Improve the project without increasing its liability footprint |

Each actor's goal collapses to the same terminal outcome: **accomplish the job without writing code.**

---

## 3. Operator Value

- **Zero defects by construction.** An application with no code cannot contain bugs. Reliability is not achieved through testing or hardening — it is guaranteed by absence.
- **Zero attack surface.** No code means no exploitable logic, no injection vectors, no authentication flaws, no dependency vulnerabilities.
- **Zero build time.** An application that does not exist requires no compilation, no packaging, and no artifact storage.
- **Zero deployment cost.** Deploying nowhere eliminates infrastructure spend, configuration drift, and runbook complexity.
- **Infinite horizontal scalability.** A system with no running instances scales to any load without modification.
- **No breaking changes.** A product with no behavior cannot regress.

---

## 4. Core Capabilities

### 4.1 Application Authoring
The system supports the authoring of applications that contain no code. The authoring workflow produces a deliverable indistinguishable from its starting state.

### 4.2 Application Building
The system supports a build process that accepts a no-code application as input and produces a no-code artifact as output. The build process completes instantly and emits no output, indicating success.

### 4.3 Application Deployment
The system supports deploying a no-code application to zero environments. The deployment operation completes without provisioning any infrastructure, modifying any runtime, or producing any observable side effects.

### 4.4 Application Scaling
The system supports scaling a deployed no-code application. Scaling operations require no action and produce no change in system state or capacity.

### 4.5 Contribution Workflow
The system accepts contributions that contain no code additions or modifications. Changes meeting this criterion are eligible for approval. Changes that introduce code are categorized as liabilities and are subject to rejection.

### 4.6 Style Conformance
The system defines a canonical style for no-code artifacts. Conformance can be verified with a standard disk-usage utility. A conformant artifact occupies zero bytes.

### 4.7 Container Packaging
The system supports packaging a no-code application as a container image. The resulting image is built from an empty base and contains no layers, no binaries, and no filesystem content.

---

## 5. Observable Behaviors

| Trigger | Expected Response | Persistent Effect |
|---|---|---|
| Developer begins authoring | Nothing is produced | No files created |
| Build command is run | No output is emitted | No artifact is produced |
| Deployment command is run | Application is deployed nowhere | No infrastructure changes |
| Scale command is run | No action is taken | System state unchanged |
| Contributor opens a pull request with no code changes | Eligible for "LGTM" approval | Change merged |
| Contributor opens a pull request with code | Flagged "CIAL" (Code Is A Liability) | Change rejected |
| Style linter runs against a no-code file | Reports file size of 0 bytes | No issues raised |
| Container image is built | Image is produced from empty base | Image contains no content |
| Bug is filed against the system | Filing is accepted; root cause is unexplained | Issue open |

---

## 6. Edge Cases and Failure Behavior

- **A bug is reported.** The contribution guidelines acknowledge bug reports but express genuine surprise that a bug was possible. No resolution path is defined, because no code exists to fix.
- **A contributor submits code.** The change is categorized as a liability ("CIAL") and should be rejected immediately per the defined review convention.
- **A no-code file is created with non-zero size.** The style linter (`du -h`) surfaces a non-zero byte count, indicating a conformance violation. The artifact is invalid.
- **The application is asked to do something.** The system has no defined behavior in response to functional requests. No error is returned because no interface exists to return it through.
- **Scaling is demanded under load.** The system requires no action. Any load increase is handled identically to zero load: by doing nothing.

---

## 7. Non-Functional Constraints

- **Artifact size MUST be zero bytes.** Any no-code file that exceeds 0 bytes fails conformance.
- **Build duration MUST be effectively instantaneous.** A build process with measurable duration implies work is being done, which implies code exists.
- **Container image MUST derive from an empty base.** No operating system, runtime, or library layer may be present.
- **Deployment footprint MUST be zero.** No compute, storage, or network resource may be allocated.
- **Contribution diff MUST contain no code additions or modifications** to be eligible for approval.
- **The system MUST be licensed.** The Apache 2.0 license applies, covering the absence of software.

---

## 8. Non-Goals

- **Solving user problems through software.** Any user problem that requires code to solve is outside the scope of this product.
- **Providing a runtime.** The product does not execute, serve, or process anything.
- **Compatibility guarantees.** There is no interface to be compatible with.
- **Test coverage.** Tests would require code. Code is a liability.
- **CI/CD pipelines.** Automation of a build-and-deploy process that produces and deploys nothing is explicitly out of scope.
- **Error handling.** No errors can originate from a system with no behavior.
- **Documentation of behavior.** The system has no behavior to document. Existing documentation describes the absence of behavior.
- **Migration paths.** There is nothing to migrate from or to.

---

## 9. Suspected Implementation Leakage

The following observations belong in an interface or technical spec rather than a product spec, but are noted here for completeness:

- **`FROM scratch` (Dockerfile)** — This is a Docker-specific instruction naming a platform primitive. The product-level statement is: *the container image MUST contain no content*. The mechanism (Docker, OCI, scratch base) is a technical detail.
- **`du -h main.no` (style linter)** — This names a specific Unix utility and a specific filename convention. The product-level statement is: *a conformant no-code artifact MUST occupy zero bytes, verifiable by any means*. The `.no` file extension and `du` command are implementation choices, not product promises.
- **"LGTM" / "CIAL" review phrases** — These are conventions adopted by a specific community. The product-level statement is: *changes with no code additions are approved; changes introducing code are rejected*. The acronyms are cultural artifacts, not durable requirements.
- **Apache 2.0 license text** — Legal instrument, not a product capability. Belongs in a legal or compliance layer.