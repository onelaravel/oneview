
```javascript
import { View } from 'oneview';
import { app } from 'oneview';

// nều có code trước export default trong script setup thì thêm vào đây

const __VIEW_PATH__ = 'admin.pages.users';
const __VIEW_NAMESPACE__ = 'admin.pages.';
const __VIEW_TYPE__ = 'view';

class AdminPagesUsersView extends View {
    $__config__ = {};
    constructor(App, systemData) {
        super(__VIEW_PATH__, __VIEW_TYPE__);
        this.__ctrl__.setApp(App);
    }

    $__setup__(__data__, systemData) {
        // put code inner wraper function here
    }
}

// Export factory function
export function AdminPagesUsers(__data__, systemData) {
    const App = app.make("App");
    const view = new AdminPagesUsersView(App, systemData);
    view.$__setup__(__data__, systemData);
    return view;
}
```