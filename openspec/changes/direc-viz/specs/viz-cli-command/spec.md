## ADDED Requirements

### Requirement: viz command registered in CLI

The `direc` binary SHALL expose a `viz` subcommand via Commander.

#### Scenario: Help output

- **WHEN** the user runs `direc viz --help`
- **THEN** the output lists the command description, `--out <path>` option, and `--open` flag

---

### Requirement: Default output path

The `viz` command SHALL default the output path to `./direc-viz.html` when `--out` is not provided.

#### Scenario: No --out flag

- **WHEN** `direc viz` is run without `--out`
- **THEN** the HTML file is written to `./direc-viz.html` in the current working directory

#### Scenario: Custom --out flag

- **WHEN** `direc viz --out /tmp/report.html` is run
- **THEN** the HTML file is written to `/tmp/report.html`

---

### Requirement: Open in browser

The `viz` command SHALL open the generated HTML file in the default browser when `--open` is provided.

#### Scenario: --open flag provided

- **WHEN** `direc viz --open` is run
- **THEN** after writing the file, the command invokes the platform's default browser open mechanism (e.g., `open` on macOS, `xdg-open` on Linux, `start` on Windows)

#### Scenario: --open flag not provided

- **WHEN** `direc viz` is run without `--open`
- **THEN** no browser is opened; the output path is printed to stdout

---

### Requirement: Locate .direc root

The `viz` command SHALL resolve the `.direc/` directory from the current working directory, walking up the directory tree until found or reaching the filesystem root.

#### Scenario: .direc found in cwd

- **WHEN** `.direc/config.json` exists in the current working directory
- **THEN** the command uses that directory as the repository root

#### Scenario: .direc found in parent

- **WHEN** the user runs `direc viz` from a subdirectory of the repository
- **THEN** the command walks upward and uses the nearest ancestor containing `.direc/`

#### Scenario: .direc not found

- **WHEN** no `.direc/` directory is found in the current directory or any ancestor
- **THEN** the command exits with a non-zero code and prints: "Could not find .direc/ directory. Run `direc init` first."

---

### Requirement: Print output path on success

The `viz` command SHALL print the absolute path of the generated HTML file to stdout on success.

#### Scenario: Successful generation

- **WHEN** `direc viz` completes without error
- **THEN** stdout includes the absolute path to the generated HTML file

---

### Requirement: Exit with non-zero code on error

The `viz` command SHALL exit with a non-zero exit code and print an error message to stderr when generation fails.

#### Scenario: Generator throws

- **WHEN** `generateViz()` throws (e.g., config missing, write error)
- **THEN** the command prints the error message to stderr and exits with code 1
