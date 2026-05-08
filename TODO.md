# BG Maker TODO

Фокус: BG Maker должен стать сильным инструментом для визуальных прототипов
настольных игр и ручного плейтеста до того, как мы начнем расти в сторону
правил, скриптов, автоматизации или мультиплеера. У редактора уже есть хорошая
база объектов и table setup; следующий шаг - сделать плейтест менее ручным, не
превращая проект в универсальный игровой движок.

## Текущее Направление Продукта

- Держать игровую настройку поведения в table setup.
- Оставлять переиспользуемые object files достаточно общими; объект колоды не
  должен знать все table setup, зоны и сценарии, где он может использоваться.
- Предпочитать настраиваемые playtest commands огромному тулбару объекта.
- Держать UI-компоненты сфокусированными на редактировании конфигурации команд
  и отправке действий; нормализацию команд и runtime-логику держать в
  helpers/stores.
- Добавлять маленькие tabletop-native возможности до широкого скриптового
  движка.

## P0 - Настраиваемые Playtest Commands

Цель: дать объекту, размещенному в table setup, показывать только те действия,
которые нужны конкретному прототипу: например, "Draw to Market" или "Refill
River", вместо показа всех возможных container actions в тулбаре выбранного
объекта.

- [x] Добавить коллекцию `commands` в поведение table setup item.
- [x] Описать первую небольшую модель команд:
  - [x] Shuffle container.
  - [x] Draw from container to table offset.
  - [x] Draw from container to target zone.
  - [x] Refill target zone from container.
- [x] Добавить стабильные ссылки на цели внутри table setup для команд.
- [x] Корректно обрабатывать удаленные или отсутствующие target items в
      нормализации команд и playtest runtime.
- [x] Клонировать, нормализовать и валидировать поведение команд в
      `project-table-setup-behavior.ts`.
- [x] Добавить focused unit tests для нормализации и клонирования команд.
- [x] Добавить UI инспектора для настройки команд на выбранных table setup
      items:
  - [x] Label команды.
  - [x] Type команды.
  - [x] Draw count.
  - [x] Draw order.
  - [x] Drawn item side.
  - [x] Target zone или table offset.
  - [x] Zone refill mode.
- [x] Оставить playtest toolbar компактным: показывать configured commands как
      основные действия объекта.
- [x] Показывать базовые действия вроде rotate, flip, hide/reveal и counters
      только когда они полезны для выбранного объекта.
- [x] Исполнять configured draw commands в `project-playtest.ts`.
- [x] Исполнять configured zone refill commands в `project-playtest.ts`.
- [x] Добавить focused playtest runtime tests:
  - [x] Draw N to table offset.
  - [x] Draw N to zone slots.
  - [x] Refill only empty zone slots.
  - [x] Учитывать accepted zone object rules.
  - [x] Учитывать side-on-enter и drawn item side.
  - [x] Безопасный no-op, когда source или target отсутствует.

## P0 - UX Зон И Контейнеров В Плейтесте

- [ ] Сделать capacity зоны и slot occupancy понятнее в инспекторе.
- [ ] Ясно показывать target names команд в playtest toolbar.
- [ ] Добавить простой способ понять, на какую zone/container указывает
      configured command.
- [x] Добавить label команды в playtest action history.
- [ ] Добавить feedback при move/drop в зону, когда команда размещает объекты в
      slots.
- [ ] Добавить поведение "empty slots first" для slot zones.
- [ ] Добавить явный blocked/no-op result для отклоненных command moves, чтобы
      тесты могли проверять намерение.

## P1 - Player Areas, Hands И Private Information

Цель: поддержать Ticket to Ride, Catan и обычные card-driven прототипы, чтобы
пользователю не приходилось изображать приватные руки скрытыми стопками на
основном столе.

- [ ] Добавить definitions игроков в table setup: label, color и order.
- [ ] Добавить owner/player metadata для placed playtest items.
- [ ] Добавить visibility modes: public, hidden, owner-only.
- [ ] Добавить tabletop-native объект `playerArea` или zone preset.
- [ ] Добавить tabletop-native объект `hand`, когда будут готовы visibility
      semantics.
- [ ] Добавить draw/deal commands, которые целятся в hand игрока.
- [ ] Добавить discard commands из hand или selected object в target container.
- [ ] Добавить "deal N to each player" как configured command.
- [ ] Добавить playtest tests для ownership и visibility.

## P1 - Больше Configured Playtest Commands

- [ ] Discard selected item to target container.
- [ ] Return selected item to source container.
- [ ] Move all items from one zone to another zone.
- [ ] Collect all items from zone into container.
- [ ] Peek/reveal top item from a container.
- [ ] Reshuffle one container into another.
- [ ] Take random item from bag into target zone.
- [ ] Поддержать grouping или ordering команд в toolbar.
- [ ] Поддержать enable/disable conditions команд по selected item count,
      source count или target capacity.

## P1 - Reference Prototype Projects

Цель: использовать давление реальных прототипов, чтобы понять, какие
tabletop-возможности важнее всего делать следующими.

- [ ] Собрать `Carcassonne-lite` как внутренний reference project.
- [ ] Собрать `Ticket-lite` как внутренний reference project.
- [ ] Собрать `Catan-lite` как внутренний reference project.
- [ ] Фиксировать неудобные моменты setup/playtest при сборке каждого reference.
- [ ] Превращать повторяющиеся неудобства в конкретные задачи редактора или
      runtime.
- [ ] Держать reference projects маленькими; это product tests, а не полные
      реализации игр.

## P2 - Rule Helpers После Сильного Ручного Слоя

Не начинать с широкого scripting engine. Добавлять маленькие tabletop-native
helpers только после того, как ручной playtest станет приятным.

- [ ] Tile edge tags для Carcassonne-style placement checks.
- [ ] Route graph helpers для Ticket to Ride-style connection checks.
- [ ] Hex adjacency helpers для Catan-style board relationships.
- [ ] Resource production helpers для Catan-style dice results.
- [ ] Легкие score calculators.
- [ ] Optional command preconditions and warnings.
- [ ] Optional action log annotations для будущего playtest analysis.

## Done - Visual Prototyping Workflow

- [x] Добавить duplicate для file tree nodes, object tree nodes и table setup
      items.
- [x] Добавить copy/paste для objects и table setup items.
- [x] Добавить multi-select во viewport.
- [x] Добавить keyboard nudging для selected objects.
- [x] Добавить align и distribute commands для selected objects.
- [x] Добавить z-order controls для table setup items и sibling objects.
- [x] Добавить lock/unlock, чтобы background boards и guides не двигались
      случайно.
- [x] Улучшить open tabs panel: context menu для closing all tabs, tabs to the
      right, other tabs и related tab actions.
- [x] Добавить zoom-to-fit и pan controls для viewport.
- [x] Добавить export для object previews и table setup screenshots.
- [x] Добавить print/export sheets для cards, tokens и tiles.

## Done - Object Library And Assets

- [x] Оставить `fileTree` project explorer и source of truth.
- [x] Добавить Object Library view поверх object files с thumbnails, search и
      type filters.
- [x] Разрешить dragging reusable objects из library в table setups.
- [x] Добавить Asset Browser view поверх image files с thumbnail grid и search.
- [x] Добавить bulk image upload.
- [x] Добавить replace image asset с сохранением existing object references.
- [x] Разрешить dragging image asset на image object или image-capable field.

## Done - Object Types, Variants And Composition

- [x] Добавить object type `Icon`.
- [x] Добавить tabletop-native object kinds для Tile, Stack и Score Track.
- [x] Отложить Hand до появления playtest semantics.
- [x] Поддержать built-in icon symbols до custom SVG import.
- [x] Поддержать icon color, opacity, stroke/fill style и padding.
- [x] Рендерить icons как scalable vector-like visuals в
      `ProjectObjectSurface`.
- [x] Добавить inspector section с icon picker и color controls.
- [x] Разрешить template bindings для icon symbol и color.
- [x] Разрешить `Icon` как child внутри cards, tokens, boards и groups.
- [x] Добавить "create object from selected object" flow.
- [x] Добавить "save as reusable object" из table setup local object.
- [x] Добавить detach linked object from source.
- [x] Добавить CSV/table import для создания card или token variants.
- [x] Добавить rulers и guides.
- [x] Добавить snap-to-object и snap-to-guide.
- [x] Добавить rotate/resize handles per corner or edge.
- [x] Добавить aspect ratio lock для resize.
- [x] Использовать templates вместо shared style presets для appearance и text.
- [x] Добавить font family selection.
- [x] Добавить auto-fit text для labels и card text blocks.
- [x] Добавить text shadow или outline для читаемых prototype labels.

## Done - Manual Playtest Baseline

- [x] Добавить explicit edit/playtest mode.
- [x] Добавить manual card flip actions.
- [x] Добавить manual deck shuffle и draw actions.
- [x] Добавить manual die roll action.
- [x] Добавить manual counter increment/decrement actions.
- [x] Добавить hidden/revealed state для placed objects.
- [x] Добавить playtest action history.

## Backlog

- [ ] Custom SVG upload/import для icons.
- [ ] Icon sets per project.
- [ ] Icon labels или accessibility names.
- [ ] Convert image asset to icon-like object.
- [ ] Добавить batch edit для template variable values.
- [ ] Добавить thumbnail previews для generated variants.
- [ ] Держать business logic вне UI components.
- [ ] Добавить focused tests для object tree, table setup, duplication, import
      и export helpers.
- [ ] Держать prototype data model changes чистыми; не добавлять migration
      layers без необходимости.
