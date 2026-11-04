# Cómo contribuir

Este proyecto lo leen y lo mantienen estudiantes. Cuando haya dos formas de hacer algo,
elegimos la más fácil de entender, aunque no sea la más corta ni la más eficiente.

Las tareas del sprint, quién va por dónde y la bitácora están en [LOGS.md](LOGS.md).

## Ramas

| Rama | Para qué |
|---|---|
| `main` | Versión que se presenta. Nunca se trabaja directamente en ella. |
| `develop` | Rama de integración: aquí llega todo lo terminado y aquí se ve el estado real del proyecto. |
| una por objetivo | Sale de `develop` y vuelve a `develop` con un pull request. Nombre corto en inglés con guiones, por ejemplo `structure` o `login`. |

Para empezar un objetivo:

```
git switch develop
git pull
git switch -c nombre-del-objetivo
```

Al terminarlo, se sube la rama con `git push -u origin nombre-del-objetivo`, se abre un pull request
hacia `develop` y otro miembro del equipo lo revisa antes de hacer merge. Cuando queremos presentar,
se abre un pull request de `develop` a `main`.

## Commits

Cada commit es un cambio con sentido propio. El mensaje empieza por el tipo de cambio y dice qué cambia:

| Tipo | Cuándo | Ejemplo |
|---|---|---|
| `feat` | Funcionalidad nueva | `feat: añade la pantalla de login` |
| `fix` | Corrige un fallo | `fix: redirige al login si el token ha caducado` |
| `docs` | Solo documentación | `docs: añade LOGS.md` |
| `chore` | Configuración, dependencias, herramientas | `chore: añade angular-eslint` |

## Antes de abrir un pull request

- `npm run build` termina sin errores.
- `npm run lint` termina sin errores.
- `npm test -- --watch=false` pasa todos los tests.
- El código está formateado con Prettier (se hace solo al guardar en VS Code).
- Si el cambio depende de algo del backend (una ruta, la forma de una respuesta, un evento del
  socket), está en el apartado Contrato de [LOGS.md](LOGS.md). Si no está, se habla antes con quien
  lleva el backend.
- Marcas en [LOGS.md](LOGS.md) las tareas que cierras y añades una entrada a la bitácora.
