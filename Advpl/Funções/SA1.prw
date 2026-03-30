
/**-------------------------------------------------------------------------------------------**/
/** PROJETO       : Funcoes Auxiliares para Cadastro de Clientes (SA1)                       **/
/** DATA          : 29/03/2026                                                                **/
/** RESPONSAVEL   : Jean Correa                                                               **/
/**-------------------------------------------------------------------------------------------**/
/**
    U_SetErro    - Centraliza o tratamento de erros, setando oIntegracao (Private)
    U_MT030MVC   - Executa o MsExecAuto para MATA030 (Clientes - SA1)
    U_ConvT      - Converte valor do JSON para o tipo ADVPL correto (reaproveitada do SA2)
**/

#Include "totvs.ch"
#Include "protheus.ch"

/**-------------------------------------------------------------------------------------------**/
/** FUNCAO      : U_SetErro                                                                   **/
/** DESCRICAO   : Seta erro na variavel Private oIntegracao compartilhada com o WS           **/
/**-------------------------------------------------------------------------------------------**/
User Function SetErro__(cMsg)
    oIntegracao['success']  := .F.
    oIntegracao['response'] := cMsg
Return

/**-------------------------------------------------------------------------------------------**/
/** FUNCAO      : U_MT030MVC                                                                  **/
/** DESCRICAO   : Executa MsExecAuto para incluir/alterar/excluir Clientes (MATA030/SA1)     **/
/** PARAMETROS  : aCampos - Array de campos {campo, valor}                                    **/
/**               nOper   - 3=Incluir, 4=Alterar, 5=Excluir                                  **/
/** RETORNO     : Array {lSucesso, cMensagem}                                                 **/
/**-------------------------------------------------------------------------------------------**/
User Function MT030MVC__(aCampos, nOper)

    Local aRet          := {.F., ""}
    Local aMataCampos   := {}
    Local nX            := 0
    Private lMsErroAuto := .F.
    Private lAutoErrStr := ""

    // Converte o array {campo, valor} para o formato exigido pelo MsExecAuto: {campo, valor, nil}
    For nX := 1 To Len(aCampos)
        aADD(aMataCampos, {aCampos[nX][1], aCampos[nX][2], Nil})
    Next

    Begin Sequence

        If nOper == 5 // Exclusao nao envia campos
            MSExecAuto({|x, y| MATA030(x, y)}, {}, nOper)
        Else
            MSExecAuto({|x, y| MATA030(x, y)}, aMataCampos, nOper)
        EndIf

        If lMsErroAuto
            aRet[1] := .F.
            aRet[2] := MostraErro()
        Else
            aRet[1] := .T.
            aRet[2] := If(nOper == 3, "Cliente incluido com sucesso.",;
                          If(nOper == 4, "Cliente alterado com sucesso.",;
                             "Cliente excluido com sucesso."))
        EndIf

    End Sequence

Return aRet

/**-------------------------------------------------------------------------------------------**/
/** FUNCAO      : U_ConvT                                                                     **/
/** DESCRICAO   : Converte um valor recebido via JSON para o tipo ADVPL correspondente       **/
/** PARAMETROS  : cTipo  - "C" (Caracter), "N" (Numerico), "D" (Data), "L" (Logico)         **/
/**               xValor - Valor em formato string vindo do JSON                             **/
/**-------------------------------------------------------------------------------------------**/
User Function ConvT__(cTipo, xValor)
    Local xRet := xValor
    Do Case
        Case cTipo == "N"
            xRet := Val(xValor)
        Case cTipo == "D"
            xRet := CToD(xValor)
        Case cTipo == "L"
            xRet := (xValor == "true" .Or. xValor == ".T.")
        Otherwise
            xRet := AllTrim(xValor)
    EndCase
Return xRet
