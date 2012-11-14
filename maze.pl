#!/usr/bin/perl
use strict;
use warnings;

use utf8;

my @table1 = qw/─ │/;

my @table2 = qw/┌ ┐ └ ┘/;

my @table3 = qw/┬ ┤ ├ ┴/;

my @table4 = qw/┼/;

my $table = {
    15 => $table4[0],
    14 => $table3[0],
    13 => $table3[2],
    12 => $table2[0],
    11 => $table3[1],
    10 => $table2[1],
    9 => $table1[1],
    8 => $table1[1],
    7 => $table3[3],
    6 => $table1[0],
    5 => $table2[2],
    4 => $table1[0],
    3 => $table2[3],
    2 => $table1[0],
    1 => $table1[1],
    0 => " ",
};

my ($width, $height) = (35, 35);
my $quiz = {};
for (my $i=0; $i<$height; $i++) {
    $quiz->{$i} = {};
    for (my $j=0; $j<$width; $j++) {
        if ($i == 0 || $i == $height-1 || $j == 0 || $j == $width-1) {
            $quiz->{$i}->{$j} = ' ';
        } else {
            $quiz->{$i}->{$j} = 'x';
        }
    }
}
$quiz->{2}->{1} = " ";
$quiz->{$height-3}->{$width-2} = " ";
search(int(rand()*17), int(rand()*17));
print transform($quiz, 35);

sub transhash {
    my $s = shift;
    my $result = {};
    my @rows = split '\n', $s;
    my $i = 0;
    for my $row (@rows) {
        $result->{$i} = {};
        my $j = 0;
        for (split '', $row) {
            $result->{$i}->{$j++} = $_;
        }
        $i++;
    }
    return $result;
}

sub transform {
    my ($s, $n) = @_;
    my ($i, $j);
    my $result = "";
    for ($i=1; $i<$n-1; $i++) {
        for ($j=1; $j<$n-1; $j++) {
            if ($s->{$i}->{$j} eq 'x') {
                my $flag = 0;
                $flag += $s->{$i+1}->{$j} eq 'x' ? 1 : 0;
                $flag = $flag*2;
                $flag += $s->{$i}->{$j+1} eq 'x' ? 1 : 0;
                $flag = $flag*2;
                $flag += $s->{$i}->{$j-1} eq 'x' ? 1 : 0;
                $flag = $flag*2;
                $flag += $s->{$i-1}->{$j} eq 'x' ? 1 : 0;
                $result = $result.$table->{$flag};
            } else {
                $result = $result." ";
            }
        }
        $result = $result." ";
    }
    return $result."                                  a";
}

sub search {
    my ($x, $y) = @_;
    my $dx = [0, 1, -1, 0];
    my $dy = [1, 0, 0, -1];
    my $zx = 2*$x;
    my $zy = 2*$y;
    $quiz->{$zy}->{$zx} = " ";
    my $turn = rand() > 0.5 ? 1 : 3;
    for (my $i=0, my $next=int(rand()*4); $i<4; $i++, $next=($next+$turn)%4) {
        if ($quiz->{$zy+2*$dy->[$next]}->{$zx+2*$dx->[$next]} eq 'x') {
            $quiz->{$zy+$dy->[$next]}->{$zx+$dx->[$next]} = " ";
            search($x+$dx->[$next], $y+$dy->[$next]);
        }
    }
}
