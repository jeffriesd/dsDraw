from collections import defaultdict
from random import randint


def notx(x, n):
    r = x
    while r == x:
        r = randint(0, n)
    if r > x:
        return [r]
    return []

def rand_graph(n, m):
    g = { i : set(notx(i, n)) for i in range(n+1) }

    for _ in range(m):
        u = randint(0, n)
        v = u
        while v == u:
            v = randint(0, n)
        
        if v > u:
            g[u].add(v)

    print("g = ugraph({")
    for k in g:
        end = "\n" if k == n else ",\n"
        print("%s: %s" % (k, list(g[k])), end = end)
    print("})")

n = int(input())
m = int(input())
rand_graph(n, m)
