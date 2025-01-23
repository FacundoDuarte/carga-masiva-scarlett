import React from 'react';
import ReactDOM from 'react-dom';
import App from './App.tsx';
import { view} from "@forge/bridge"
import '@atlaskit/css-reset';

await view.theme.enable();

ReactDOM.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
    document.getElementById('root')
);
