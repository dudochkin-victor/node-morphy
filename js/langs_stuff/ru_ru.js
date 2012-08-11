function Morphy_GrammemsProvider_ru_RU()/* extends Morphy_GrammemsProvider_ForFactory*/ {
    var self_encoding = 'windows-1251';
    var instances = [];

    var grammems_map = { 
        '���' : ['��', '��', '��'], 
        '��������������' : ['��', '��'], 
        '�����' : ['��', '��'], 
        '�����' : ['��', '��', '��', '��', '��', '��', '��', '2'], 
        '�����' : ['���', '���'], 
        '�����' : ['���', '���', '���'], 
        '������������� �����' : ['���'], 
        '����' : ['1�', '2�', '3�'], 
        '���������' : ['��'], 
        '������������� �����' : ['�����'], 
        '������������ �������' : ['����'],
        '���' : ['��', '��'],
        '������������' : ['��', '��'],
        '��������� ������' : ['����'],
    }; 

    function getSelfEncoding() {
        return 'windows-1251';
    }

    function getGrammemsMap() {
        return this.grammems_map;
    }

    function instance(/*Morphy*/ morphy) {
        key = morphy.getEncoding();

        if(!this.instances[key]) {
            func = __CLASS__;
            this.instances[key] = new class(key);
        }

        return this.instances[key];
    }
}
