Feature: Login
  Como usuario do sistema
  Quero autenticar com email e senha
  Para acessar minha area logada

  @smoke @login
  Scenario: Login com credenciais validas
    Given que estou na pagina de login
    When preencho email e senha validos
    And clico no botao de entrar
    Then devo ser redirecionado para a area logada

  @regression @login
  Scenario: Login com senha invalida
    Given que estou na pagina de login
    When preencho email valido e senha incorreta
    And clico no botao de entrar
    Then devo ver uma mensagem de erro de credenciais invalidas
