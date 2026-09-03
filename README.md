# Meu Plano

Aplicativo pessoal e instalável para Android, criado a partir do PRD, da dieta modular de 2.600 kcal e do treino iniciante full body A/B de 40 minutos. A versão 2 inclui login por Supabase Auth e sincronização protegida por RLS.

## O que está incluído

- cinco abas: Hoje, Dieta, Treino, Evolução e Perfil;
- dieta já preenchida com as porções, modelos e receitas dos PDFs;
- construtor modular P/C/L/V/G sem sair da aba Dieta;
- registro, favoritos, água e pulo de refeição com redistribuição do restante;
- treino A/B completo, séries, carga, repetições, RIR, técnica, dor e descanso;
- recomendação explicada de progressão de carga/repetições;
- login pessoal sem senha escrita no código;
- medidas e histórico sincronizados no Supabase, com cópia offline no aparelho;
- funcionamento offline após a primeira abertura.

## Configurar o Supabase

1. Escolha ou crie um projeto Supabase.
2. Execute `supabase/setup.sql` no SQL Editor desse projeto.
3. Em **Authentication > Users**, crie o usuário interno `fgvmoti@meuplano.app`, marque-o como confirmado e informe a senha escolhida pelo proprietário do app.
4. Em **Settings > API Keys**, copie somente a chave `sb_publishable_...`.
5. Preencha `supabaseUrl` e `supabasePublishableKey` em `config.js`.

O usuário verá apenas o nome de acesso `Fgvmoti`. A senha é validada pelo Supabase Auth; ela não fica no código nem é gravada no banco do aplicativo.

**Nunca coloque uma secret key, service_role ou senha em `config.js`.** A chave publicável foi criada para uso no navegador; os registros são protegidos pelas políticas RLS de `app_state`.

## Executar no computador

Não há dependências para instalar. Na pasta do projeto, execute:

```bash
npm start
```

Depois abra `http://localhost:8080`.

## Instalar no Android

1. Conclua a configuração do Supabase acima.
2. Publique esta pasta no Vercel ou em outra hospedagem HTTPS estática.
3. Abra o endereço no Chrome do Android.
4. Toque no menu do Chrome e selecione **Instalar app** ou **Adicionar à tela inicial**.

O app abrirá em tela cheia e manterá uma cópia offline. Ao recuperar a conexão, as alterações pendentes são sincronizadas com o Supabase.

## Testes

```bash
npm test
```

## Observação de saúde

As metas e porções são a configuração inicial dos documentos fornecidos. O aplicativo acompanha o plano; não substitui avaliação médica, nutricional ou profissional para dor, lesão e mudanças relevantes de dieta.
