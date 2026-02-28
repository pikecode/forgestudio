# Feature 2: Page-Level Workflow Triggers - Implementation Complete

## Summary

Successfully implemented page-level workflow triggers that allow workflows to be executed automatically when a Taro page loads using the `useLoad` hook.

## Changes Made

### 1. Protocol Extension (`packages/protocol/src/types.ts`)
- Extended `PageDef` interface with `onLoadWorkflow` field:
  ```typescript
  onLoadWorkflow?: {
    workflowId: string
    outputMapping?: Record<string, string>
  }
  ```

### 2. Editor UI (`packages/editor/src/components/PageManager.tsx`)
- Added workflow selector dropdown in page edit form
- Users can now select which workflow to execute on page load
- Dropdown shows all available workflows from the schema

### 3. Store Action (`packages/editor/src/store.ts`)
- Added `updatePageOnLoadWorkflow` action to update page workflow binding
- Properly handles adding/removing workflow associations

### 4. IR Extension (`packages/codegen-core/src/ir.ts`)
- Extended `IRPage` interface with `onLoadWorkflow` field:
  ```typescript
  onLoadWorkflow?: {
    workflowHandlerName: string
    outputVars: string[]
  }
  ```

### 5. Transformer (`packages/codegen-core/src/transformer.ts`)
- Modified `transformPageToIR` to process `onLoadWorkflow`
- Extracts workflow handler name using `toCamelCase` helper
- Collects output variables from workflow definition
- Added `toCamelCase` utility function for consistent naming

### 6. Code Generation (`packages/codegen-taro/src/generate-tsx.ts`)
- Added `useLoad` import detection when `onLoadWorkflow` is present
- Generates workflow handler import: `import { handleWorkflowName } from '../workflow-handlers'`
- Generates `useLoad` hook body:
  ```typescript
  useLoad(async () => {
    await handleWorkflowName()
  })
  ```
- Properly integrates with existing React hooks and Taro imports

### 7. Tests (`packages/codegen-taro/src/generate-tsx.test.ts`)
- Added unit tests for useLoad hook generation
- Test case 1: Verifies useLoad hook is generated when onLoadWorkflow is present
- Test case 2: Verifies useLoad hook is NOT generated when onLoadWorkflow is absent
- All tests passing (2/2)

## Test Results

✅ All codegen-workflow tests passing (9/9)
✅ All codegen-taro tests passing (2/2)
✅ TypeScript compilation successful
✅ No linting errors

## Generated Code Example

For a page with `onLoadWorkflow` configured:

```typescript
import { useLoad } from 'react'
import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { handleLoadProducts } from '../workflow-handlers'
import './index.scss'

export default function ProductList() {
  const [products, setProducts] = useState<any[]>([])

  useLoad(async () => {
    await handleLoadProducts()
  })

  return (
    <View>
      <Text>Product List</Text>
    </View>
  )
}
```

## Integration Points

1. **Editor → Protocol**: User selects workflow in PageManager UI
2. **Protocol → IR**: Transformer converts workflow reference to handler name
3. **IR → Code**: Code generator produces useLoad hook with workflow call
4. **Runtime**: Taro page executes workflow on load via useLoad hook

## Next Steps

Feature 2 is now complete. All three workflow enhancements have been successfully implemented:

- ✅ Feature 3: Condition branch edge labels (auto true/false)
- ✅ Feature 1: Parallel node codegen (Promise.all)
- ✅ Feature 2: Page-level workflow triggers (useLoad hook)

Ready for end-to-end testing and integration verification.
