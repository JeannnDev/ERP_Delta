
/**-------------------------------------------------------------------------------------------**/
/** PROJETO	    : Ponto de Entrada MVC do cadastro de fornecedores                     	      **/
/** DATA 		: 21/03/2026														          **/
/** RESPONSÁVEL	: Jean Correa                   	  										  **/
/**-------------------------------------------------------------------------------------------**/
#Include "rwmake.ch"
#Include "protheus.ch"
#Include "topconn.ch"
#Include "totvs.ch"
#Include "tbiconn.ch"
#Include "fwmbrowse.ch"
#Include "fwmvcdef.ch"

#Define ENTER CHR(13)+CHR(10)
/**-------------------------------------------------------------------------------------------**/
/** FUNCAO		    : MT020MVC  											                  **/
/** DESCRICAO		: Ponto de Entrada MVC do cadastro de fornecedores				          **/
/**-------------------------------------------------------------------------------------------**/

User Function MT020MVC(aCampos, nOper)

    Local aRet          := {.F., ""}
    Local aErro         := {}
    Local lOk           := .F.
    Local nX            := 0

    Default nOper := 3 // 3=Incluir | 4=Alterar | 5=Excluir

    Private lMsErroAuto := .F.
    Private lMsHelpAuto := .T.
    Private lAutoErrNoFile := .T.

    If nOper == 3
        aAdd(aCampos, {"A2_CODPAIS", "01058"})
    EndIf

    lOk := MSExecAuto({|x,y,z| MATA020(x,y,z)}, aCampos, nOper)

    If lOk

        aRet[1] := .T.

        Do Case
            Case nOper == 3
                aRet[2] := "Fornecedor incluído com sucesso!"
            Case nOper == 4
                aRet[2] := "Fornecedor alterado com sucesso!"
            Case nOper == 5
                aRet[2] := "Fornecedor excluído com sucesso!"
        EndCase

    Else

        aRet[1] := .F.

        aErro := GetAutoGRLog()

        If ValType(aErro) == "A"


           For nX := 1 To Len(aErro)
                If ValType(aErro[nX]) == "C"
                    aRet[2] := aRet[2] + aErro[nX] + ENTER
                EndIf
            Next nX

        Else
            aRet[2] := "Erro ao processar fornecedor."
        EndIf

    EndIf

Return aRet

/**-------------------------------------------------------------------------------------------------------------------------------------**/
/** FUNCAO        : ConvT                                                                                                               **/
/** DESCRICAO     : Converte os tipos de dados para o tipo solicitado. Utilizada para conversão dos parâmetros recebidos no webservice. **/
/**-------------------------------------------------------------------------------------------------------------------------------------**/

User Function ConvT(cTipo, xValor)

	Local xValConv := xValor

	Do Case
		Case cTipo == "D"
			
			If ValType(xValor) == "C"
				
				xValConv := CToD(xValor)

				If Empty(xValConv)
					xValConv := SToD(xValor)
				EndIf

			EndIf
			
		Case cTipo == "N"
			
			If ValType(xValor) == "C"
				xValConv := Val(xValor)
			EndIf

		Case cTipo == "C"
			
			If ValType(xValor) == "N"
				xValConv := cValToChar(xValor)
			EndIf

			xValConv := Upper(AllTrim(FwNoAccent(DecodeUTF8(xValConv))))

	EndCase

Return xValConv



/**-----------------------------------------------------------------------------------------------------------------**/
/** FUNCAO        : SetErro                                                                                         **/
/** DESCRICAO     : Seta o erro e a mensagem para retorno no webservice                                             **/
/**-----------------------------------------------------------------------------------------------------------------**/

User Function SetErro(cMsg, nCode)

    Default nCode := 400

    oIntegracao['response'] := FWhttpEncode(cMsg)
    oIntegracao['success'] := .F.

    oRest:setFault(oIntegracao['response'])
    oRest:setStatusCode(nCode)

Return
