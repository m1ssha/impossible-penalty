# Публикация и автоматические обновления

## Как работает CD

После успешного workflow `Quality` для текущего `main` запускается
`.github/workflows/cd.yml`. Он собирает конкретный проверенный коммит в Docker-образ
и передаёт его по SSH без внешнего registry. Устаревшие коммиты пропускаются.
Адрес сервера, адрес сайта и доступ находятся только в Secrets окружения `production`.
GitHub Pages не используется.

На сервере новый контейнер запускается для проверки на временном локальном порту.
Проверяются `/healthz` и `/version.txt`, содержащий полный SHA коммита. Только после
этого останавливается рабочий контейнер и запускается новая версия на
`127.0.0.1:8088`. При ошибке её запуска возвращается предыдущий контейнер.
Обновления выполняются последовательно под серверной блокировкой. Во время
переключения возможна короткая пауза. Workflow также проверяет публичный HTTPS
и совпадение опубликованной версии с проверенным коммитом.

## Запуск Docker локально

Установите Docker Engine с Compose, затем выполните:

```bash
docker compose -f compose.deploy.yml up -d --build
```

Игра откроется на `http://127.0.0.1:8088`. Остановка:

```bash
docker compose -f compose.deploy.yml down
```

Образ содержит только nginx и статические файлы, работает от пользователя `nginx`
с read-only файловой системой, ограниченными логами и healthcheck. При локальной
сборке `/version.txt` содержит `local`. Для привязки образа к коммиту передайте
`docker build --build-arg RELEASE_SHA=ПОЛНЫЙ_SHA -t impossible-penalty:ПОЛНЫЙ_SHA .`.

## Подготовка собственного сервера

Нужны Linux с Bash, Docker Engine, gzip, flock, sudo, OpenSSH и nginx с настроенным
HTTPS. Внешний nginx проксирует корень сайта на `http://127.0.0.1:8088`, сохраняет
обычные заголовки Host, X-Real-IP, X-Forwarded-For и X-Forwarded-Proto. ACME и TLS
остаются в конфигурации внешнего nginx. Порт 8088 не открывается наружу.

Установите от root файлы с владельцем root и режимом 0755:

- `activate-image.sh` → `/usr/local/sbin/impossible-penalty-deploy`;
- `ssh-command.sh` → `/usr/local/sbin/impossible-penalty-ssh`.

Создайте отдельного системного пользователя `penalty-deploy` с shell `/bin/bash`
и заблокированным паролем. Он не должен входить в группы sudo или docker.
В sudoers разрешите ему только серверный скрипт:

```text
penalty-deploy ALL=(root) NOPASSWD: /usr/local/sbin/impossible-penalty-deploy *
```

Проверьте файл командой `visudo -cf ПУТЬ_К_ФАЙЛУ`. Создайте отдельную пару SSH-ключей
Ed25519 для этого проекта. В `authorized_keys` пользователя добавьте публичный
ключ с префиксом:

```text
restrict,command="/usr/local/sbin/impossible-penalty-ssh" ssh-ed25519 ПУБЛИЧНЫЙ_КЛЮЧ
```

Каталог пользователя, `.ssh`, `authorized_keys` и серверные скрипты должны быть
недоступны пользователю деплоя на запись. Ключ разрешает только передачу образа
с полным 40-символьным SHA; обычные команды и SSH-forwarding запрещены. Скрипт
запускает доверенный образ с ограничениями контейнера. Доступ к записи workflow
и main поэтому должен оставаться только у доверенных участников.

## GitHub Secrets

В Settings → Environments создайте `production`, разрешите deployment только
из ветки `main` и добавьте Secrets:

| Имя                | Значение                                                  |
| ------------------ | --------------------------------------------------------- |
| DEPLOY_HOST        | Адрес сервера                                             |
| DEPLOY_USER        | Отдельный пользователь деплоя                             |
| DEPLOY_PORT        | SSH-порт; пустое значение означает 22                     |
| DEPLOY_SSH_KEY     | Приватный ключ только для этого деплоя                    |
| DEPLOY_KNOWN_HOSTS | Проверенная запись host key сервера, включая адрес и порт |
| DEPLOY_URL         | Публичный HTTPS-адрес приложения                          |

Host key нужно сверить через доверенный канал; workflow не отключает его проверку.
Ключ администратора сервера для Actions не используется. Приватные ключи и
значения Secrets не добавляются в репозиторий. Файлы `deployment/*.local.*`
игнорируются Git и не попадают в контекст Docker.

Последующие обновления: отправьте изменения в `main` и дождитесь зелёных `Quality`
и `Deploy` в Actions. Дополнительные действия на сервере не нужны. Изменения
самих серверных SSH-скриптов администратор устанавливает отдельно.

## Откат и диагностика

Предыдущий контейнер сохраняется остановленным как `impossible-penalty-previous`.
Администратор может вернуть его:

```bash
sudo docker stop impossible-penalty
sudo docker rename impossible-penalty impossible-penalty-failed
sudo docker rename impossible-penalty-previous impossible-penalty
sudo docker start impossible-penalty
curl --fail http://127.0.0.1:8088/healthz
```

После диагностики удалите `impossible-penalty-failed`, чтобы имя было свободно при
следующем ручном откате. Ошибки приложения видны через
`sudo docker logs --tail 100 impossible-penalty`, статус — через `sudo docker ps`.
Скрипт не удаляет образы и контейнеры других приложений. Неиспользуемые старые
образы игры администратор может удалять отдельно по мере необходимости.
