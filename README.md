# Forge Hello World

This project contains a Forge app written in Javascript that displays `Hello World!` in a Jira project page. 

See [developer.atlassian.com/platform/forge/](https://developer.atlassian.com/platform/forge) for documentation and tutorials explaining Forge.

## Requirements

See [Set up Forge](https://developer.atlassian.com/platform/forge/set-up-forge/) for instructions to get set up.

## Quick start
- Install dependecies (inside root directory)
```
bun install
```
- Install dependencies (inside of the `static/hello-world` directory)::
```
bun install

O sino desde la raiz:

bun build:frontend
bun clean:frontend ## para hacer un clean
```

- Modify your app by editing the files in `static/hello-world/src/`.

- Build your app (inside of the `static/hello-world` directory):
```
bun run build
```

- Deploy your app by running:
```
forge deploy
```

- Install your app in an Atlassian site by running:
```
forge install
```

### Notes
- Use the `forge deploy` command when you want to persist code changes.
- Use the `forge install` command when you want to install the app on a new site.
- Once the app is installed on a site, the site picks up the new app changes you deploy without needing to rerun the install command.

## Support

See [Get help](https://developer.atlassian.com/platform/forge/get-help/) for how to get help and provide feedback.

## Pendientes
- Que se deje de llamar en bucle la consulta de los jobs ✅
- Consultar correctamente el estado de los jobs según la paginación✅
- Cuando cambia de página, que desaparezca el spinner de carga✅
- Sacar todos los console.log
- Ver como cargar correctamente el proveedor (es un campo de assets) -> Usar el proveedor id y mediante automation rule, asignar el proveedor en el campo de assets -> hablar con Joaco. 
- Tener en cuenta que cuando un ticket tiene cierta resolución, no se debe modificar.
- Eliminar los archivos temporales en aws 
- Habilitar el botón de ejecutar cambios cuando se suba el archivo
- Preparar la depuracion de los logs actuales y poner logs de como se van actualizando los jobs, para obtener información de como se van completando.