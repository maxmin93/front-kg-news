# Front-KG-News

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 11.2.0.


## Development server

Run `ng serve --port 4200` for a dev server. <br>
And open browser to `http://localhost:4200/`.


## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.


## Issues

[\[BABEL\] Could not find plugin "proposal-class-properties"](https://github.com/babel/babel/issues/12247)

package.json

```json
{
    "scripts": {
        "preinstall": "npx npm-force-resolutions",
        ...
    },
    ...
    "resolutions": {
        "@babel/preset-env": "7.12.11"
    }
}
```

## Dependencies

If you miss "--routing" option:

* ng generate module app-routing --flat --module=app

Add material and cdk

* ng add @angular/material
* npm i -s @angular/flex-layout @angular/cdk

Add third-party libraries

* npm i lodash --save
  * usage: `import * as _ from 'lodash';`
* npm i cytoscape --save
* npm i cytoscape-popper --save
  * @popperjs/core
  * `+` npm i tippy.js --save
* npm i cytoscape-dagre --save
  * dagre
* npm i cytoscape-klay --save
  * klay
* npm i cytoscape-euler --save

and edit angular.json

```json
{
    "styles": [
        "node_modules/@angular/material/prebuilt-themes/deeppurple-amber.css",
        "node_modules/tippy.js/themes/material.css",
        "src/styles.scss"
    ],
    "scripts": [
        "node_modules/lodash/lodash.min.js",
        "node_modules/cytoscape/dist/cytoscape.min.js",
        "node_modules/@popperjs/core/dist/umd/popper.min.js",
        "node_modules/tippy.js/dist/tippy.umd.min.js",
        "node_modules/cytoscape-popper/cytoscape-popper.js",
        "node_modules/cytoscape-euler/cytoscape-euler.js",
        "node_modules/dagre/dist/dagre.js",
        "node_modules/cytoscape-dagre/cytoscape-dagre.js",
        "node_modules/klayjs/klay.js",
        "node_modules/cytoscape-klay/cytoscape-klay.js"
    ]
}
```


## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

### product build error

If you met these messages,

```bash
$ ng build --prod

Warning: /Users/bgmin/Workspaces/ng_app/front-kg-news/src/app/app.component.scss exceeded maximum budget. Budget 6.00 kB was not met by 7.86 kB with a total of 13.86 kB.

Error: /Users/bgmin/Workspaces/ng_app/front-kg-news/src/app/app.component.scss exceeded maximum budget. Budget 10.00 kB was not met by 3.86 kB with a total of 13.86 kB.
```

edit budgets in angular.json [stackoverflow](https://stackoverflow.com/a/65432433)

```json
"budgets": [
   {
      "type": "initial",
      "maximumWarning": "4mb",
      "maximumError": "5mb"
   },
   {
      "type": "anyComponentStyle",
      "maximumWarning": "150kb",
      "maximumError": "150kb"
   }
]
```


## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
