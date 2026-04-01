#Include "protheus.ch"
#Include "totvs.ch"

User Function ERPPOUI()
    Local cApp := "angular"

    If !FwCallApp(cApp)
        MsgStop("O aplicativo '" + cApp + "' não foi encontrado no RPO ou não está registrado.", "Erro PO UI")
    EndIf

Return
