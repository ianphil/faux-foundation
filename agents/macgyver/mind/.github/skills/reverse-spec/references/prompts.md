# Prompt Pack

## Product Lens

Use this when starting from a repo, demo, doc set, or product artifact.

```text
Analyze this software as a product, not as an implementation. Identify the problem it solves, the actors it serves, the operator or business value it creates, and the major capabilities it appears to offer. Avoid discussing code structure, frameworks, libraries, or internal architecture unless they are externally visible constraints.
```

## Capability Extraction

Use this after initial orientation.

```text
Extract the system's capabilities in durable product terms. Group them by user-facing outcome rather than by module or code area. For each capability, state who benefits, what becomes possible, and what conditions must be true for the capability to be considered present.
```

## Observable Behavior

Use this to stay black-box.

```text
Describe only externally observable behavior. For each apparent feature, state the trigger, the visible response, any persistent effect, and the visible failure modes. Do not mention internal components or implementation choices unless they are part of the public contract.
```

## Requirement Conversion

Use this to turn notes into specs.

```text
Convert these observations into product requirements. Each requirement must be testable, implementation-agnostic, and written in terms of externally observable behavior or user-visible outcomes. Rewrite or remove any statement that depends on a particular framework, library, or runtime.
```

## Leakage Review

Use this as a final pass.

```text
Review this draft and flag statements that are really technical design, interface detail, or implementation mechanism rather than product specification. For each flagged item, explain why it leaks implementation and suggest a cleaner product-level rewrite or a better destination layer.
```

## Epic Decomposition

Use this for larger systems.

```text
Break this product into epic-level capability areas. For each epic, provide: the operator value, the core system capability, the key user flows, major edge cases, and the boundaries of what is out of scope. Keep the content product-level and avoid internal architecture.
```

## Clean-Room Summary

Use this when learning from OSS and you want distance from the source implementation.

```text
Reconstruct the product concept from this software as if writing a clean-room product brief. Preserve user value, capabilities, constraints, and externally visible behavior, but avoid copying internal names, code structure, or source-specific mechanisms unless they are part of the external product contract.
```
